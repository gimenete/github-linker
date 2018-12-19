# GitHub Linker

## Features

GitHub linker allows you to select a piece of text and create a permantent link to GitHub.com for that piece of text. Just select the text, right click, and you'll see two new options.

The first option just copies a permanent link to the clipboard. For example:

https://github.com/integrations/jira/blob/d1a890ae8a7092ca08cb9fdf527fcc25f471e68c/lib/models/index.js#L9-L15

The second option not only copies the link but also copies the piece of selected text properly wrapped in a markdown code block with the programming language correctly specified. For example:

    https://github.com/integrations/jira/blob/d1a890ae8a7092ca08cb9fdf527fcc25f471e68c/lib/models/index.js#L9-L15

    ```javascript
    Object.assign(config, {
      operatorsAliases: false,
      benchmark: true,
      logging: (query, ms) => {
        logger.debug({ ms }, query)
      }
    })
    ```

Which will be rendered as:

https://github.com/integrations/jira/blob/d1a890ae8a7092ca08cb9fdf527fcc25f471e68c/lib/models/index.js#L9-L15

```javascript
Object.assign(config, {
  operatorsAliases: false,
  benchmark: true,
  logging: (query, ms) => {
    logger.debug({ ms }, query)
  }
})
```

## Requirements

The file must be tracked in a git repo and the current branch must be pushed to GitHub.com.

If you've made changes to the file that are not pushed to GitHub.com, the link could be not accurate.

## Release Notes

### 0.0.1

Initial version

**Enjoy!**
