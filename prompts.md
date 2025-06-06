## 1 [plan mode]

We're making a CLI with typescript and commander JS. It is called `meta-composer`

This is the code for a similar utility. Use it as the template and reference for how to structure a similar tool in this project. Read the source code from this project to make any decision about how a CLI should be written. Read: ~/code/docs/repomix.claude-composer.xml

`meta-compser` CLI has 4 subcommands:

- `build` <resource> <type>`
- `list <resource> <type>`
- `peek <resource> <id>, [<id>]`
- `show <resource> <id>, [<id>]`

Let's write all the boilerplate needed for this CLI tool so we can then start working on the business logic

Make a blank readme with only the title of the project as a header

Handlers for the commands, configuration for the subcommands and flags

Don't write any code. Each handler should only print out all the information it has, which will only be things like the command and arguments provided. Essentially each command should echo its input.

Let's make a plan.

## 2

Let's not use the name "type" in the CLI, instead call it "category". Update everywhere.
