import { useSignIn } from "@clerk/clerk-react";
import { Button } from "./ui/button";

export const SignInOAuthButtons = () => {
    const { signIn, isLoaded } = useSignIn();

    if (!isLoaded) {
        return null; // or a loading spinner
    }

    const signInWithGoogle = () => {
        signIn.authenticateWithRedirect({ 
            strategy: "oauth_google",
            redirectUrl: "/sso-callback",
            redirectUrlComplete: "/auth-callback",
    });
    };

  return (
    <Button onClick={signInWithGoogle}  variant={"secondary"} className="w-full text-white border-zinc-200 h-11 hover:bg-zinc-800">
        Continue with Google
    </Button>
  )
};
export default SignInOAuthButtons;
