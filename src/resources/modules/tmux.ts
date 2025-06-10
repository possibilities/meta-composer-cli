import { Command } from 'commander'
import { execSync } from 'child_process'
import yaml from 'js-yaml'

async function getInfo(): Promise<string> {
  try {
    execSync('tmux -V', { stdio: 'pipe' })
  } catch {
    throw new Error('tmux is not installed or not accessible')
  }

  const tmuxEnv = process.env.TMUX
  if (!tmuxEnv) {
    throw new Error('Not running inside a tmux session')
  }

  const info: any = {}

  const [socketPath, sessionId, windowPaneId] = tmuxEnv.split(',')
  info.socket_path = socketPath
  info.session_id = sessionId
  info.window_pane_id = windowPaneId

  try {
    info.tmux_version = execSync('tmux -V', { encoding: 'utf8' }).trim()
  } catch {
    info.tmux_version = 'unknown'
  }

  try {
    const paneId = execSync('tmux display-message -p "#{pane_id}"', {
      encoding: 'utf8',
    }).trim()
    info.pane = {
      id: paneId,
      index: execSync('tmux display-message -p "#{pane_index}"', {
        encoding: 'utf8',
      }).trim(),
      title: execSync('tmux display-message -p "#{pane_title}"', {
        encoding: 'utf8',
      }).trim(),
      width: parseInt(
        execSync('tmux display-message -p "#{pane_width}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      height: parseInt(
        execSync('tmux display-message -p "#{pane_height}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      current_path: execSync('tmux display-message -p "#{pane_current_path}"', {
        encoding: 'utf8',
      }).trim(),
      current_command: execSync(
        'tmux display-message -p "#{pane_current_command}"',
        { encoding: 'utf8' },
      ).trim(),
      pid: parseInt(
        execSync('tmux display-message -p "#{pane_pid}"', {
          encoding: 'utf8',
        }).trim(),
      ),
      tty: execSync('tmux display-message -p "#{pane_tty}"', {
        encoding: 'utf8',
      }).trim(),
      active:
        execSync('tmux display-message -p "#{pane_active}"', {
          encoding: 'utf8',
        }).trim() === '1',
      synchronized:
        execSync('tmux display-message -p "#{pane_synchronized}"', {
          encoding: 'utf8',
        }).trim() === '1',
    }
  } catch (error) {
    info.pane = { error: 'Failed to get pane information' }
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
    .description('Get tmux configuration and session information')
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
}
