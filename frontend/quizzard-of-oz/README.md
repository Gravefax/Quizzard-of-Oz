


# Google Api Token

- Go to: https://console.cloud.google.com/cloud-resource-manager

- Create a project.
- Give it a name an press create.
- Wait until the project is created.


Go to: https://console.cloud.google.com/auth/overview

- On the top left next to the Google Cloud Brand click the button and select your created project if not already selected.

- In the overview page in the middle is a button "first Steps" click it

- Give the App a name for example "QOO" then give it a email (normally this is the mail the users get if they need support for your app)

- Press NExt

- Select Extern for Target group

- Give your email (can be the same as the support ) for contact data

-  Press Next and accept and create

- After that you need to create the OAuth-Client

-On the Far right in the first box on the Overview page you can create the client


- First you need to select the kind of Software. In this case select Webapp.

- Give it a name for example "Qoo-OAuth"

- After that you need to add authorised Sources for local development you need to add **http://localhost:3000**

- Click create

- Then a popup opens in this you need to get the client key and the client-ID

- The Client-ID then needs to be in both .env files (backend/frontend). Into GOOGLE_CLIENT_ID. 





