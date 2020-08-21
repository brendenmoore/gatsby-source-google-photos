#! /usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs")
const {google} = require("googleapis")
const inquirer = require("inquirer")
const glob = require("glob")

const NEW_PROJECT_URL = "https://console.developers.google.com/projectcreate"
const PHOTOS_API_URL =
  "https://console.developers.google.com/apis/library/photoslibrary.googleapis.com"
const OAUTH_URL =
  "https://console.developers.google.com/apis/credentials/oauthclient"

const envFiles = glob.sync(".env*")

if (envFiles.length === 0) {
  envFiles.push(".env")
}

async function waitConfirmation() {
  const {confirm} = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "I read and followed the instructions",
      default: false,
    },
  ])

  if (!confirm) {
    throw new Error("Please read and follow the instructions")
  }
}

async function generateToken() {
  try {
    console.log("Create a new Google project:")
    console.log(NEW_PROJECT_URL)
    console.log("")

    await waitConfirmation()

    console.log("")
    console.info("Enable Google Photos API:")
    console.log(PHOTOS_API_URL)
    console.log("")

    await waitConfirmation()

    console.log("")
    console.info('Create an "OAuth Client ID" with the config:')
    console.info('Name: "gatsby-source-google-photos"')
    console.info('Type: "Web application"')
    console.info('Redirect uri: "http://localhost"')
    console.log("")
    console.log(OAUTH_URL)
    console.log("")

    await waitConfirmation()

    console.log("")
    console.log("Copy your `Client ID` and `Client secret`")
    const {client_id, client_secret} = await inquirer.prompt([
      {
        type: "input",
        name: "client_id",
        message: "Client ID:",
        validate: (input) => !!input,
      },
      {
        type: "input",
        name: "client_secret",
        message: "Client Secret:",
        validate: (input) => !!input,
      },
    ])

    const client = new google.auth.OAuth2(
      client_id,
      client_secret,
      "http://localhost"
    )

    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/photoslibrary.readonly"],
      prompt: "consent",
    })

    console.log("")
    console.log("Open the following URL in a browser")
    console.log(authUrl)
    console.log("")
    console.log("Ignore the insecure warning")
    console.log("Authorize the application")
    console.log("Copy the code from the callback URL")
    console.log("http://localhost/?...&code=  [_COPY_THIS_]  &...")
    console.log("")

    const {authorization_code} = await inquirer.prompt([
      {
        type: "input",
        name: "authorization_code",
        message: "Code:",
        validate: (input) => !!input,
      },
    ])

    if (!authorization_code) {
      console.error("Invalid authorisation code")
      return
    }

    const {tokens} = await client.getToken(authorization_code)

    envFiles.forEach((file) => {
      fs.appendFileSync(
        file,
        `GATSBY_SOURCE_GOOGLE_PHOTOS_TOKEN=${JSON.stringify({
          client_id,
          client_secret,
          ...tokens,
        })}\n`
      )
    })

    console.log("")
    console.log("Token added successfully to your .env files")
    console.log("Enjoy `gatsby-source-google-photos` plugin")
  } catch (e) {
    console.log("")
    console.error(e.message)
  }
}

generateToken()
