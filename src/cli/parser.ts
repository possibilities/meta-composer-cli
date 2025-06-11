import { Command } from 'commander'
import packageJson from '../../package.json'
import { registry } from '../resources/registry.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('meta-composer')
    .description('A tool for composing and traversing arbitrary information')
    .version(packageJson.version)

  program.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = helper.padWidth(cmd, helper)
      const helpWidth = helper.helpWidth || 80
      const itemIndentWidth = 2
      const itemSeparatorWidth = 2

      function formatItem(term: string, description: string) {
        if (description) {
          const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`
          return fullText
        }
        return term
      }

      function formatList(textArray: string[]) {
        return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth))
      }

      let output = []

      const usage = helper.commandUsage(cmd)
      output.push('Usage: ' + usage + '\n')

      // Check if this is a subcommand and if it has help metadata
      const commandName = cmd.name()
      const module = registry.get(commandName)

      // For subcommands with instructions, show them before commands
      if (module && module.instructions) {
        output.push(module.instructions)
      } else {
        // Only show description for non-module commands
        const description = helper.commandDescription(cmd)
        if (description) {
          output.push(description + '\n')
        }
      }

      // Only show options for non-module commands
      if (!module || !module.instructions) {
        const optionList = helper.visibleOptions(cmd).map(option => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option),
          )
        })
        if (optionList.length) {
          output.push('Options:\n' + formatList(optionList) + '\n')
        }
      }

      const commandList = helper
        .visibleCommands(cmd)
        .filter(subCmd => subCmd.name() !== 'help') // Exclude help command
        .map(cmd => {
          return formatItem(
            helper.subcommandTerm(cmd),
            helper.subcommandDescription(cmd),
          )
        })
      if (commandList.length) {
        output.push('Commands:\n' + formatList(commandList) + '\n')
      }

      return output.join('\n')
    },
  })

  return program
}
