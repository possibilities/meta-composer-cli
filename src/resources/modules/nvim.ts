import { Command } from 'commander'
import { execSync } from 'child_process'
import yaml from 'js-yaml'

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

  const nvimInfo = {
    command: nvimProcesses[0].command,
    pane_id: nvimProcesses[0].pane_id,
    pid: nvimProcesses[0].pid,
    working_directory: nvimProcesses[0].working_directory,
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
