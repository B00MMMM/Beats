import { SignUp } from "@clerk/clerk-react";
import styles from './AuthPages.module.css';

export default function SignUpPage() {
  return (
    <div className={styles.authContainer}>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
  );
}
