import { SignIn } from "@clerk/clerk-react";
import styles from './AuthPages.module.css';

export default function SignInPage() {
  return (
    <div className={styles.authContainer}>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" forceRedirectUrl="/" />
    </div>
  );
}
