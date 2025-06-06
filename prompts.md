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

## 3

Let's remove the build command altogether

## 4

These are the current subcommands:

```
  list <resource> <category>  List resources of a specific category
  peek <resource> <id...>     Peek at one or more resources by ID
  show <resource> <id...>     Show one or more resources by ID
```

This project will support many resources over time. We will create a system that allows adding a module with the appropriate exports which can be used to support each of the three subcommands.

The signature for the functions in these modules should mirror the subcommand. For example:

- `listResource(resource, category)`
- `peekResource(resouce, ...ids)`
- etc

Make a plan.

## 5

Remove `peek` subcommand from the project
