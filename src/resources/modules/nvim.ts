import { Command } from 'commander'
import { execSync } from 'child_process'
import yaml from 'js-yaml'
import * as net from 'net'
import { encode, decode } from '@msgpack/msgpack'

async function getInfo(): Promise<string> {
  const tmuxEnv = process.env.TMUX
  if (!tmuxEnv) {
    throw new Error('Not running inside a tmux session')
  }

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
              const [procPid, parentPid, ...cmdParts] = parts
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
                if (
                  childCmd &&
                  (childCmd.includes('nvim') || childCmd.includes('vim'))
                ) {
                  fullCommand = childCmd
                  break
                }
              } catch {
                continue
              }
            }
          }
        } catch {
          // Keep the basic command if we can't get the full command line
        }

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
  } = {
    command: nvimProcess.command,
    pane_id: nvimProcess.pane_id,
    pid: nvimProcess.pid,
    working_directory: nvimProcess.working_directory,
  }

  // Parse --listen argument from command
  const listenMatch = nvimProcess.command.match(/--listen\s+([^\s]+)/)
  if (listenMatch && listenMatch[1]) {
    const socketPath = listenMatch[1]
    nvimInfo.socket = socketPath

    // Try to connect to Neovim and get current buffer
    try {
      const socket = new net.Socket()

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.destroy()
          reject(new Error('Connection timeout'))
        }, 2000)

        socket.on('connect', () => {
          clearTimeout(timeout)
          resolve()
        })
        socket.on('error', err => {
          clearTimeout(timeout)
          reject(err)
        })
        socket.connect(socketPath)
      })

      // Simple msgpack-rpc implementation
      let msgId = 0
      const pendingRequests = new Map<
        number,
        {
          resolve: (value: any) => void
          reject: (error: Error) => void
        }
      >()
      let buffer = Buffer.alloc(0)

      // Handle incoming data
      socket.on('data', chunk => {
        buffer = Buffer.concat([buffer, chunk])

        // Try to decode messages
        while (buffer.length > 0) {
          try {
            const msg = decode(buffer) as any

            // Calculate consumed bytes
            const consumed = encode(msg).length
            buffer = buffer.slice(consumed)

            // msgpack-rpc format: [type, msgid, error, result]
            if (Array.isArray(msg) && msg[0] === 1) {
              // Response
              const [, responseId, error, result] = msg
              const handler = pendingRequests.get(responseId)
              if (handler) {
                pendingRequests.delete(responseId)
                if (error) {
                  handler.reject(new Error(error))
                } else {
                  handler.resolve(result)
                }
              }
            }
          } catch (e) {
            // Not enough data yet, wait for more
            break
          }
        }
      })

      // Send request helper
      const sendRequest = (method: string, args: any[]): Promise<any> => {
        return new Promise((resolve, reject) => {
          const id = msgId++
          pendingRequests.set(id, { resolve, reject })

          // msgpack-rpc request format: [type=0, msgid, method, params]
          const request = [0, id, method, args]
          const encoded = encode(request)
          socket.write(Buffer.from(encoded))

          // Timeout after 1 second
          setTimeout(() => {
            if (pendingRequests.has(id)) {
              pendingRequests.delete(id)
              reject(new Error('Request timeout'))
            }
          }, 1000)
        })
      }

      try {
        // Wait a bit for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 50))

        // Get current buffer
        const bufferId = await sendRequest('nvim_get_current_buf', [])

        // Get buffer name
        const bufferName = await sendRequest('nvim_buf_get_name', [bufferId])

        nvimInfo.current_buffer = bufferName || '(unnamed)'
      } catch (error) {
        nvimInfo.current_buffer = `(error: ${error.message})`
      } finally {
        // Clean up
        socket.end()
      }
    } catch (error) {
      nvimInfo.current_buffer = '(connection failed)'
    }
  }

  return yaml.dump(nvimInfo, { indent: 2, lineWidth: -1 })
}

export function registerNvimCommands(program: Command): void {
  const nvimCmd = program.command('nvim').description('Neovim information')

  nvimCmd
    .command('get-info')
    .description('Get Neovim configuration and plugin information')
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
}
