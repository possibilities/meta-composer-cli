import { Command } from 'commander'
import { execSync } from 'child_process'
import yaml from 'js-yaml'

async function getInfo(): Promise<string> {
  try {
    execSync('tmux -V', { stdio: 'pipe' })
  } catch {
    throw new Error('tmux is not installed or not accessible')
  }

  const info: any = {}

  const tmuxEnv = process.env.TMUX
  if (tmuxEnv) {
    const [socketPath, sessionId, windowPaneId] = tmuxEnv.split(',')
    info.socket_path = socketPath
    info.session_id = sessionId
    info.window_pane_id = windowPaneId
  }

  try {
    info.tmux_version = execSync('tmux -V', { encoding: 'utf8' }).trim()
  } catch {
    info.tmux_version = 'unknown'
  }

  try {
    const paneList = execSync('tmux list-panes -F "#{pane_id}"', {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean)

    info.panes = paneList.map(paneId => {
      const getPaneInfo = (format: string) =>
        execSync(`tmux display-message -t ${paneId} -p "${format}"`, {
          encoding: 'utf8',
        }).trim()

      const pid = parseInt(getPaneInfo('#{pane_pid}'))
      const currentCommand = getPaneInfo('#{pane_current_command}')
      let fullCommand = currentCommand

      try {
        // Get the process tree to find the actual command
        const psTree = execSync(
          `ps -eo pid,ppid,args | grep -E "^\\s*(${pid}|[0-9]+\\s+${pid})" | grep -v grep`,
          {
            encoding: 'utf8',
          },
        )
          .trim()
          .split('\n')

        // Find the process that matches the current_command
        for (const line of psTree) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 3) {
            const [procPid, parentPid, ...cmdParts] = parts
            const cmd = cmdParts.join(' ')

            // Check if this command matches the current_command
            if (
              cmd.includes(currentCommand) &&
              !cmd.includes('zsh') &&
              !cmd.includes('bash') &&
              !cmd.includes('sh ')
            ) {
              fullCommand = cmd
              break
            }
          }
        }

        // If we still haven't found it, try to get the command for any child process
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
                fullCommand = childCmd
                break
              }
            } catch {
              // Continue to next child
            }
          }
        }
      } catch {
        // Keep the basic command if we can't get the full command line
      }

      return {
        id: paneId,
        index: getPaneInfo('#{pane_index}'),
        title: getPaneInfo('#{pane_title}'),
        width: parseInt(getPaneInfo('#{pane_width}')),
        height: parseInt(getPaneInfo('#{pane_height}')),
        current_path: getPaneInfo('#{pane_current_path}'),
        current_command: getPaneInfo('#{pane_current_command}'),
        full_command: fullCommand,
        pid: pid,
        tty: getPaneInfo('#{pane_tty}'),
        active: getPaneInfo('#{pane_active}') === '1',
        synchronized: getPaneInfo('#{pane_synchronized}') === '1',
      }
    })
  } catch (error) {
    info.panes = [{ error: 'Failed to get pane information' }]
  }

  try {
    info.window = {
      id: execSync('tmux display-message -p "#{window_id}"', {
        encoding: 'utf8',
      }).trim(),
      index: execSync('tmux display-message -p "#{window_index}"', {
        encoding: 'utf8',
      }).trim(),
      name: execSync('tmux display-message -p "#{window_name}"', {
        encoding: 'utf8',
      }).trim(),
      width: parseInt(
        execSync('tmux display-message -p "#{window_width}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      height: parseInt(
        execSync('tmux display-message -p "#{window_height}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      layout: execSync('tmux display-message -p "#{window_layout}"', {
        encoding: 'utf8',
      }).trim(),
      panes: parseInt(
        execSync('tmux display-message -p "#{window_panes}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      active:
        execSync('tmux display-message -p "#{window_active}"', {
          encoding: 'utf8',
        }).trim() === '1',
      zoomed:
        execSync('tmux display-message -p "#{window_zoomed_flag}"', {
          encoding: 'utf8',
        }).trim() === '1',
    }
  } catch (error) {
    info.window = { error: 'Failed to get window information' }
  }

  try {
    info.session = {
      id: execSync('tmux display-message -p "#{session_id}"', {
        encoding: 'utf8',
      }).trim(),
      name: execSync('tmux display-message -p "#{session_name}"', {
        encoding: 'utf8',
      }).trim(),
      windows: parseInt(
        execSync('tmux display-message -p "#{session_windows}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      width: parseInt(
        execSync('tmux display-message -p "#{session_width}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      height: parseInt(
        execSync('tmux display-message -p "#{session_height}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      created: parseInt(
        execSync('tmux display-message -p "#{session_created}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      attached: parseInt(
        execSync('tmux display-message -p "#{session_attached}"', {
          encoding: 'utf8',
        }).trim(),
      ),
    }
  } catch (error) {
    info.session = { error: 'Failed to get session information' }
  }

  try {
    info.client = {
      tty: execSync('tmux display-message -p "#{client_tty}"', {
        encoding: 'utf8',
      }).trim(),
      terminal: execSync('tmux display-message -p "#{client_termname}"', {
        encoding: 'utf8',
      }).trim(),
      encoding:
        execSync('tmux display-message -p "#{client_utf8}"', {
          encoding: 'utf8',
        }).trim() === '1'
          ? 'utf8'
          : 'other',
      width: parseInt(
        execSync('tmux display-message -p "#{client_width}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      height: parseInt(
        execSync('tmux display-message -p "#{client_height}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      pid: parseInt(
        execSync('tmux display-message -p "#{client_pid}"', {
          encoding: 'utf8',
        }).trim(),
      ),
    }
  } catch (error) {
    info.client = { error: 'Failed to get client information' }
  }

  return yaml.dump(info, { indent: 2, lineWidth: -1 })
}

export function registerTmuxCommands(program: Command): void {
  const tmuxCmd = program.command('tmux').description('tmux information')

  tmuxCmd
    .command('get-info')
    .description('Retrieve configuration and session information from tmux')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const result = await getInfo()
        console.log(result)
      } catch (error) {
        console.error('Error getting tmux info:', error)
        process.exit(1)
      }
    })
}

export const tmuxModule = {
  name: 'tmux',
  registerCommands: registerTmuxCommands,
  instructions: `Tmux integration for meta-composer
The following commands interact with tmux sessions:

- Detects if running inside a tmux session and provides context
- Lists all active tmux sessions with window and pane information
- Shows detailed information about the current pane including running processes
- Captures full command lines and working directories for each pane
- Useful for understanding and integrating tmux workspace context`,
}
