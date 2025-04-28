import BasenameExplorer from '@/components/BasenameExplorer';
import NavigationBar from '@/components/NavigationBar';
import SpendSaveWallet from '@/components/SpendSaveWallet';
import '../components/basename-explorer.css';
import '../components/navigation-bar.css';
import './page-styles.css';

export default function Home() {
  return (
    <>
      <NavigationBar />
      <main className="main-content">
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="gradient-text">SpendSave</span> Protocol
            </h1>
            <p className="hero-subtitle">
              Automate your savings and investments with our sophisticated DeFi protocol built on Uniswap V4
            </p>
            <div className="hero-buttons">
              <button className="primary-button">Get Started</button>
              <button className="secondary-button">View Documentation</button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">$4.2M</span>
                <span className="stat-label">Total Savings</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">12.4K</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">3.2%</span>
                <span className="stat-label">Avg. APY</span>
              </div>
            </div>
          </div>
          <div className="hero-graphics">
            <div className="hero-graphic-item">
              <div className="hero-wallet-container">
                {/* <SpendSaveWallet /> */}
              </div>
            </div>
          </div>
        </section>
        
        <section className="features-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                <span className="gradient-text">Smart Savings</span> Features
              </h2>
              <p className="section-description">
                SpendSave protocol makes it easy to optimize your crypto savings and investments
              </p>
            </div>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3 className="feature-title">Automated Savings</h3>
                <p className="feature-description">
                  Set up recurring deposits and automate your crypto savings strategy
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <h3 className="feature-title">Dollar-Cost Averaging</h3>
                <p className="feature-description">
                  Schedule regular investments to reduce the impact of volatility
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔄</div>
                <h3 className="feature-title">Yield Optimization</h3>
                <p className="feature-description">
                  Automatically allocate funds to the highest yielding protocols
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🛡️</div>
                <h3 className="feature-title">Risk Management</h3>
                <p className="feature-description">
                  Set risk parameters and protect your savings with smart thresholds
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
