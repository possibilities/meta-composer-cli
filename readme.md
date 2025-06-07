# Meta Composer

A tool for traversing arbitrary information

## What is Meta Composer?

This tool is based on the premises:

- LLMs are good at using ["layered tools"](https://engineering.block.xyz/blog/build-mcp-tools-like-ogres-with-layers)
- Claude Code will excel at using any simple, expressive, CLI

This tool leverages those two ideas to give Claude Code (and similar agenst) a way to traverse documentation and metadata to build up context that is useful.

## Usage

The recommended way to use this tool is to create prompts with instructions for an agent about when and how to start using the CLI tools included. Running any of the subcommands with a --help flag also provides good high level information to the agent so it is also recommended to include the output in the prompt, or otherwise part of the context, for your agent.
