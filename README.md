# RWCryptTool

A simple pure front-end encryptor using RWSE2 and RWSH

## Solved Issues

- [x] "It is slow!" - RWSE2 is based on 64-bit operations, but JavaScript does not support this well. WebAssembly is used to deal with this issue.
