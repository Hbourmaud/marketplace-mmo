# MarketPlace MMO Monorepo

## How to start the project

### Need
- Node 20 (https://www.nvmnode.com/guide/download.html) and ***nvm install 20*** then ***nvm use 20***

### First time launching
- Run : npm install (this install all the packages and modules needed)

### Angular Frontend
- Move to marketplace folder
- Run : npx nx serve shop (shop is the frontend workspace name)

### Node / Express Backend
- Move to marketplace folder
- Run : npx nx serve api

## Troubleshoot
### Sometimes node don't shut down properly so need to kill node process
- On Windows run : **taskkill /F /IM node.exe**