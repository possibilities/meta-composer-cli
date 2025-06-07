# Meta Composer

A tool for traversing arbitrary information

## What is Meta Composer?

This tool is based on the following ideas:

- LLMs are good at using ["layered tools"](https://engineering.block.xyz/blog/build-mcp-tools-like-ogres-with-layers)
- Claude Code excels at using any simple, expressive, CLI

This tool leverages those two ideas to give Claude Code, and similar agents, a way to traverse documentation and other metadata.

## Usage

The recommended way to use this tool is to create prompts with instructions for an agent about when and how to start using the CLI tools included. Running any of the subcommands with a --help flag also provides good high level information to the agent so it is also recommended to include the output in the prompt, or otherwise part of the context, for your agent.

```
▶ meta-composer --help
Usage: meta-composer [options] [command]

A tool for composing and traversing arbitrary information

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  shadcn          shadcn UI components
  openapi         OpenAPI specifications
  lucid           Lucide icons
  help [command]  display help for command

Subcommands for shadcn:

  list-components               List all shadcn UI components
  get-component-by-name <name>  Get details for a specific shadcn component by name

Subcommands for openapi:

  list-operations <uri>                     List all API operations from the specified OpenAPI URI
  get-operation-by-id <uri> <operation-id>  Get details for a specific API operation by operation ID

Subcommands for lucid:

  list-icon-names                   List all Lucide icon names
  list-icon-categories              List all Lucide icon categories
  list-icon-tags                    List all Lucide icon tags
  get-icons-by-category <category>  Get all icons that belong to a specific category
  get-icons-by-tag <tag>            Get all icons that have a specific tag
```
