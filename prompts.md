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

## 6 [plan mode]

Currently we support "abstract" <resource> subcommands:

list <resource> <category> List resources of a specific category
show <resource> <id...> Show one or more resources by ID

Let's support "concrete" subcommands instead, e.g:

list example <category> List examples of a specific category

When we run the cli, each possible resource type (found in @src/resources/modules/) should also return everything needed to make a new "list" and a new "show" subcommand.

Potentially a good implementation would be for each module in @src/resources/modules/ to import commmanderjs (look up /tj/commanderjs with context7) and export everything needed to "plug" into the CLI.

## 6.1

That looks good but we need the output to be:

show example <id...> Show one or more example resources by ID

Rather than how it is now:

show <example> <id...> Show one or more example resources by ID

## 6.2

Now it looks like this:

Commands:
list List resources
show Show resources
help [command] display help for command

But it should look like this

Commands:
list examples List examples
show examples Show examples
help [command] display help for command

## 7 [plan mode]

We previously made a tool in python that would take a local clone of a github repo and process it down into a folder full of files that are useful for another project I'm working on. Read the source code here: ~/code/docs/ui-composer-mcp.xml

Use the ui-composer-mcp.xml code as a reference to undestand the logic that parses and processes the documentation from a specific github repo into the desired format.

Introduce a new module in @src/resources/modules/ called `shadn`.

It will be an expensive function so it will gather all the resources to a filesystem cache ~/.meta-composer/cache/resources/shadcn (similar to how ~/code/docs/ui-composer-mcp.xml works)

When calling the `list` function it will warm the cache if it doesn't exist yet.

When calling the `show` function it will return an error if the cache doesn't exist yet.

Both subcommands should continue to do nothing other than this new behavior, we will finish the business logic using the cached data at a later time.

Work through the process of warming the cache when `list` is called accoring to the correct logic at ~/code/docs/ui-composer-mcp.xml

## 7.1 [plan mode]

Ignore everything about lucid icons

## 8

Implement `meta-composer shadcn list` command

The list command alrady does the work to warm a file cache

Now we will read from that cache to return a meaningful response when calling the `meta-composer shadcn list` command

We originally implemented all of this in a python project that you can read here: ~/code/docs/ui-composer-mcp.xml. You can read the source, specifically the file ./ui_composer_mcp/server.py and the function ui_show_component_details, to learn how to work with the cached data and return the expected response. Implement it to work identically and return the equivelent string when the `meta-composer shadcn list` command is called.
