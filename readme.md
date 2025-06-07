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
  shadcn          shadcn/ui components
  openapi         OpenAPI specifications
  lucid           Lucide icons
  help [command]  display help for command

Subcommands for shadcn:

  meta-composer shadcn list-components               List all shadcn/ui components
  meta-composer shadcn get-component-by-name <name>  Get details for a specific shadcn/ui component by name
  meta-composer shadcn read-about-typography         The documentation page for shadcn/ui typography
  meta-composer shadcn read-about-theming            The documentation page for shadcn/ui theming

Subcommands for openapi:

  meta-composer openapi list-operations <uri>                     List all API operations from the specified OpenAPI URI
  meta-composer openapi get-operation-by-id <uri> <operation-id>  Get details for a specific API operation by operation ID

Subcommands for lucid:

  meta-composer lucid list-icons                        List all Lucide icons
  meta-composer lucid list-icon-categories              List all Lucide icon categories
  meta-composer lucid list-icon-tags                    List all Lucide icon tags
  meta-composer lucid get-icons-by-category <category>  Get all icons that belong to a specific category
  meta-composer lucid get-icons-by-tag <tag>            Get all icons that have a specific tag
  meta-composer lucid read-about-react-usage            The documentation page for lucid icon usage in React
```
