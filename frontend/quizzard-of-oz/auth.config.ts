import AuthConfig from "@/app/models/AuthConfig";

const authCredentials: AuthConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID!,
};

export default authCredentials;
