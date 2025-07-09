import { Command } from 'commander'
import { execSync } from 'child_process'
import yaml from 'js-yaml'
import * as net from 'net'
import { encode, Decoder } from '@msgpack/msgpack'
import {
  getCommandMetadata,
  getSubcommandDescription,
} from '../metadata-loader'

async function getInfo(): Promise<string> {
  const nvimProcesses: Array<{
    pane_id: string
    pid: number
    command: string
    working_directory: string
  }> = []

  try {
    const paneList = execSync('tmux list-panes -F "#{pane_id}"', {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean)

    for (const paneId of paneList) {
      const getPaneInfo = (format: string) =>
        execSync(`tmux display-message -t ${paneId} -p "${format}"`, {
          encoding: 'utf8',
        }).trim()

      const pid = parseInt(getPaneInfo('#{pane_pid}'))
      const currentCommand = getPaneInfo('#{pane_current_command}')
      const currentPath = getPaneInfo('#{pane_current_path}')

      if (currentCommand === 'nvim' || currentCommand === 'vim') {
        let fullCommand = currentCommand

        try {
          const psTree = execSync(
            `ps -eo pid,ppid,args | grep -E "^\\s*(${pid}|[0-9]+\\s+${pid})" | grep -v grep`,
            {
              encoding: 'utf8',
            },
          )
            .trim()
            .split('\n')

          for (const line of psTree) {
            const parts = line.trim().split(/\s+/)
            if (parts.length >= 3) {
              const [, , ...cmdParts] = parts
              const cmd = cmdParts.join(' ')

              if (
                (cmd.includes('nvim') || cmd.includes('vim')) &&
                !cmd.includes('zsh') &&
                !cmd.includes('bash') &&
                !cmd.includes('sh ')
              ) {
                fullCommand = cmd
                break
              }
            }
          }

          if (fullCommand === currentCommand) {
            const children = execSync(`pgrep -P ${pid}`, { encoding: 'utf8' })
              .trim()
              .split('\n')
              .filter(Boolean)

            for (const childPid of children) {
              try {
                const childCmd = execSync(`ps -p ${childPid} -o args=`, {
                  encoding: 'utf8',
                }).trim()
                if (childCmd && childCmd.includes(currentCommand)) {
                  if (
                    childCmd.includes('--listen') ||
                    !fullCommand.includes('--listen')
                  ) {
                    fullCommand = childCmd
                    if (childCmd.includes('--listen')) {
                      break
                    }
                  }
                }
              } catch {
                continue
              }
            }
          }
        } catch {}

        nvimProcesses.push({
          pane_id: paneId,
          pid: pid,
          command: fullCommand,
          working_directory: currentPath,
        })
      }
    }
  } catch (error) {
    throw new Error('Failed to search for nvim processes in tmux panes')
  }

  if (nvimProcesses.length === 0) {
    throw new Error('No nvim instance found in current tmux window')
  }

  if (nvimProcesses.length > 1) {
    throw new Error(
      `Found ${nvimProcesses.length} nvim instances in current tmux window. Only one instance is supported`,
    )
  }

  const nvimProcess = nvimProcesses[0]
  const nvimInfo: {
    command: string
    pane_id: string
    pid: number
    working_directory: string
    socket?: string
    current_buffer?: string
    selection?: {
      mode: string
      start_line: number
      start_col: number
      end_line: number
      end_col: number
      content: string
    }
    full_content?: string
  } = {
    command: nvimProcess.command,
    pane_id: nvimProcess.pane_id,
    pid: nvimProcess.pid,
    working_directory: nvimProcess.working_directory,
  }

  const listenMatch = nvimProcess.command.match(/--listen\s+([^\s]+)/)
  if (listenMatch && listenMatch[1]) {
    const socketPath = listenMatch[1]
    nvimInfo.socket = socketPath

    try {
      const socket = new net.Socket()

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.destroy()
          reject(new Error(`Connection timeout to socket: ${socketPath}`))
        }, 5000)

        socket.on('connect', () => {
          clearTimeout(timeout)
          resolve()
        })
        socket.on('error', err => {
          clearTimeout(timeout)
          reject(new Error(`Socket connection error: ${err.message}`))
        })
        socket.connect(socketPath)
      })

      let msgId = 0
      const pendingRequests = new Map<
        number,
        {
          resolve: (value: any) => void
          reject: (error: Error) => void
        }
      >()

      const decoder = new Decoder()

      socket.on('data', chunk => {
        try {
          for (const msg of decoder.decodeMulti(chunk)) {
            if (Array.isArray(msg) && msg[0] === 1) {
              const [, responseId, error, result] = msg
              const handler = pendingRequests.get(responseId)
              if (handler) {
                pendingRequests.delete(responseId)

                const timeout = timeouts.get(responseId)
                if (timeout) {
                  clearTimeout(timeout)
                  timeouts.delete(responseId)
                }
                if (error) {
                  handler.reject(new Error(error))
                } else {
                  handler.resolve(result)
                }
              }
            }
          }
        } catch (err) {
          console.error('Error decoding msgpack:', err)
        }
      })

      const timeouts = new Map<number, NodeJS.Timeout>()

      const sendRequest = (method: string, args: any[]): Promise<any> => {
        return new Promise((resolve, reject) => {
          const id = msgId++
          pendingRequests.set(id, { resolve, reject })

          const request = [0, id, method, args]
          const encoded = encode(request)
          socket.write(Buffer.from(encoded))

          const timeout = setTimeout(() => {
            if (pendingRequests.has(id)) {
              pendingRequests.delete(id)
              timeouts.delete(id)
              reject(new Error(`Request timeout for method: ${method}`))
            }
          }, 5000)
          timeouts.set(id, timeout)
        })
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 200))

        const bufferId = await sendRequest('nvim_get_current_buf', [])

        const bufferName = await sendRequest('nvim_buf_get_name', [bufferId])
        nvimInfo.current_buffer = bufferName || '(unnamed)'

        try {
          const lineCount = await sendRequest('nvim_buf_line_count', [bufferId])
          if (lineCount > 0) {
            const allLines = await sendRequest('nvim_buf_get_lines', [
              bufferId,
              0,
              -1,
              false,
            ])
            nvimInfo.full_content = allLines.join('\n')
          }
        } catch (error) {}

        try {
          const modeInfo = await sendRequest('nvim_get_mode', [])
          const mode = modeInfo.mode

          const hasVisualMarks = await sendRequest('nvim_eval', [
            'getpos("\'<")[1] > 0',
          ])

          if (
            mode === 'v' ||
            mode === 'V' ||
            mode === '\x16' ||
            hasVisualMarks
          ) {
            let startPos, endPos
            let selectionMode = mode

            if (mode === 'v' || mode === 'V' || mode === '\x16') {
              startPos = await sendRequest('nvim_eval', ['getpos("v")'])
              endPos = await sendRequest('nvim_eval', ['getpos(".")'])
            } else {
              startPos = await sendRequest('nvim_eval', ['getpos("\'<")'])
              endPos = await sendRequest('nvim_eval', ['getpos("\'>")'])

              const lastVisualMode = await sendRequest('nvim_eval', [
                'visualmode()',
              ])
              selectionMode = lastVisualMode || 'v'
            }

            let startLine = startPos[1]
            let startCol = startPos[2] - 1
            let endLine = endPos[1]
            let endCol = endPos[2] - 1

            if (
              startLine > endLine ||
              (startLine === endLine && startCol > endCol)
            ) {
              ;[startLine, endLine] = [endLine, startLine]
              ;[startCol, endCol] = [endCol, startCol]
            }

            const lines = await sendRequest('nvim_buf_get_lines', [
              bufferId,
              startLine - 1,
              endLine,
              false,
            ])

            let content = ''

            if (selectionMode === 'V') {
              content = lines.join('\n')
            } else if (selectionMode === 'v') {
              if (startLine === endLine) {
                content = lines[0].substring(startCol, endCol + 1)
              } else {
                const selectedLines = []
                for (let i = 0; i < lines.length; i++) {
                  if (i === 0) {
                    selectedLines.push(lines[i].substring(startCol))
                  } else if (i === lines.length - 1) {
                    selectedLines.push(lines[i].substring(0, endCol + 1))
                  } else {
                    selectedLines.push(lines[i])
                  }
                }
                content = selectedLines.join('\n')
              }
            } else if (selectionMode === '\x16') {
              const selectedLines = []
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i]

                selectedLines.push(line.substring(startCol, endCol + 1))
              }
              content = selectedLines.join('\n')
            }

            nvimInfo.selection = {
              mode:
                selectionMode === 'v'
                  ? 'charwise'
                  : selectionMode === 'V'
                    ? 'linewise'
                    : 'blockwise',
              start_line: startLine,
              start_col: startCol + 1,
              end_line: endLine,
              end_col: endCol + 1,
              content,
            }
          }
        } catch (error) {
          console.error(
            'Error detecting visual selection:',
            error instanceof Error ? error.message : String(error),
          )
        }
      } catch (error) {
        nvimInfo.current_buffer = `(error: ${error instanceof Error ? error.message : String(error)})`
      } finally {
        for (const timeout of timeouts.values()) {
          clearTimeout(timeout)
        }
        timeouts.clear()
        pendingRequests.clear()

        socket.destroy()
      }
    } catch (error) {
      nvimInfo.current_buffer = `(connection failed: ${error instanceof Error ? error.message : String(error)})`
    }
  }

  return yaml.dump(nvimInfo, { indent: 2, lineWidth: -1 })
}

export function registerNvimCommands(program: Command): void {
  const metadata = getCommandMetadata('nvim')

  const nvimCmd = program.command('nvim').description(metadata.description)

  nvimCmd
    .command('get-info')
    .description(getSubcommandDescription('nvim', 'get-info'))
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const result = await getInfo()
        console.log(result)
      } catch (error) {
        console.error('Error getting nvim info:', error)
        process.exit(1)
      }
    })
}

export const nvimModule = {
  name: 'nvim',
  registerCommands: registerNvimCommands,
  instructions: getCommandMetadata('nvim').instructions,
}
