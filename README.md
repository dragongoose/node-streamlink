# node-streamlink
A promise-based streamlink wrapper for NodeJS

## Installation
```bash
npm install @dragongoose/node-streamlink
```

## Usage
Typescript & Javascript example where it saves the stream to a file
```javascript
import { Streamlink } from '@dragongoose/node-streamlink'
import { createWriteStream } from 'fs'

// you can also use cjs format
// const { Streamlink } = require('@dragongoose/node-streamlink')
// const { createWriteStream } = require('fs')

const client = new Streamlink('https://twitch.tv/projektmelody', {
    outputStdout: true // Outputs stream to log event
})

const streamFile = createWriteStream('./stream.mp4')

client.begin()
client.on('log', data => {
    streamFile.write(data) // puts data into file
})

client.on('close', () => {
    streamFile.close() // closes the file when the stream ends or is closed
})

```
More detailed explanations can be found in the comments of the code, or intellisense should display it.