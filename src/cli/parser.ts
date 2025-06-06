import { Command } from 'commander'
import { registry } from '../resources/index.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('meta-composer')
    .description('A tool for composing and traversing arbitrary information')
    .version('0.1.0')

  // Add custom help formatting to show installed modules
  program.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = helper.padWidth(cmd, helper)
      const helpWidth = helper.helpWidth || 80
      const itemIndentWidth = 2
      const itemSeparatorWidth = 2

      function formatItem(term, description) {
        if (description) {
          const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`
          return helper.wrap(
            fullText,
            helpWidth - itemIndentWidth,
            termWidth + itemSeparatorWidth,
          )
        }
        return term
      }

      function formatList(textArray) {
        return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth))
      }

      let output = []

      // Usage
      const usage = helper.commandUsage(cmd)
      output.push('Usage: ' + usage + '\n')

      // Description
      const description = helper.commandDescription(cmd)
      if (description) {
        output.push(description + '\n')
      }

      // Add installed modules section only for the main help
      if (cmd.name() === 'meta-composer') {
        const modules = registry.list()
        if (modules.length > 0) {
          output.push('Installed modules:\n' + formatList(modules) + '\n')
        }
      }

      // Options
      const optionList = helper.visibleOptions(cmd).map(option => {
        return formatItem(
          helper.optionTerm(option),
          helper.optionDescription(option),
        )
      })
      if (optionList.length) {
        output.push('Options:\n' + formatList(optionList) + '\n')
      }

      // Commands
      const commandList = helper.visibleCommands(cmd).map(cmd => {
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
