import logoImage from '../../assets/Beats-logo.png'
import styles from './Logo.module.css'

function Logo() {
  return (
    <div className={styles.logoContainer}>
      <img 
        src={logoImage} 
        alt="Beats Logo" 
        className={styles.logoImage}
      />
    </div>
  )
}

export default Logo
