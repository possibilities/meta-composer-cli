import { Command } from 'commander'
import { registry } from '../resources/index.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('meta-composer')
    .description('A tool for composing and traversing arbitrary information')
    .version('0.1.0')

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

      const usage = helper.commandUsage(cmd)
      output.push('Usage: ' + usage + '\n')

      const description = helper.commandDescription(cmd)
      if (description) {
        output.push(description + '\n')
      }

      const optionList = helper.visibleOptions(cmd).map(option => {
        return formatItem(
          helper.optionTerm(option),
          helper.optionDescription(option),
        )
      })
      if (optionList.length) {
        output.push('Options:\n' + formatList(optionList) + '\n')
      }

      const commandList = helper.visibleCommands(cmd).map(cmd => {
        return formatItem(
          helper.subcommandTerm(cmd),
          helper.subcommandDescription(cmd),
        )
      })
      if (commandList.length) {
        output.push('Commands:\n' + formatList(commandList) + '\n')
      }

      if (cmd.name() === 'meta-composer') {
        const modules = registry.list()
        for (const moduleName of modules) {
          const module = registry.get(moduleName)
          if (module) {
            const commands = module.getCommandInfo()
            if (commands.length > 0) {
              output.push(`Subcommands for ${moduleName}:\n`)

              const subcommandTerms = commands.map(cmd => {
                return cmd.arguments
                  ? `${cmd.name} ${cmd.arguments.join(' ')}`
                  : cmd.name
              })
              const maxSubcommandWidth = Math.max(
                ...subcommandTerms.map(term => term.length),
              )

              const subcommandList = commands.map((cmd, index) => {
                const cmdName = subcommandTerms[index]
                const padding = ' '.repeat(
                  Math.max(0, maxSubcommandWidth - cmdName.length),
                )
                return `  ${cmdName}${padding}  ${cmd.description}`
              })
              output.push(subcommandList.join('\n') + '\n')
            }
          }
        }
      }

      return output.join('\n')
    },
  })

  return program
}
