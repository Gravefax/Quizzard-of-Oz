import AuthCredential from "@/app/models/AuthCredential";

export default interface AuthStoreState {
    credential: AuthCredential | null;
    setCredential: (authCredential: AuthCredential | null) => void;
    getCredential: () => AuthCredential | null;
    clearCredential: () => void;
}