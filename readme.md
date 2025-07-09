# Meta Composer

A tool for traversing arbitrary information

## What is Meta Composer?

This tool is based on the following ideas:

- LLMs are good at using ["layered tools"](https://engineering.block.xyz/blog/build-mcp-tools-like-ogres-with-layers)
- Claude Code excels at using any simple, expressive, CLI

This tool leverages those two ideas to give Claude Code, and similar agents, a way to traverse documentation and other metadata.

## Usage

The recommended way to use this tool is to give the results of the `help` subcommands to an AI agent and leave it to the agent to use it correctly in it's workflow. These help subcommands are written with AI agents in mind explaining how the commands can work together to provide context and/or functionality to the agent.

Run `meta-composer --help` to get a list of possible commands
