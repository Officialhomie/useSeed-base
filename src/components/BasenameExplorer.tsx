'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { useAvatar, useName } from '@coinbase/onchainkit/identity';
import { getAvatar, getName } from '@coinbase/onchainkit/identity';
import { _base, baseSepolia } from 'wagmi/chains';

// Example addresses with Basenames
const FEATURED_ADDRESSES = [
  '0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1',
  '0x4d2c72C4Da3c001859efC497755bEf16A45BA126',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
] as const;

type EthAddress = `0x${string}`;

// Profile Card component using direct components with fallback error handling
const ProfileCard = ({ address }: { address: string }) => {
  const [_hasError, setHasError] = useState(false);
  const safeAddress = address as EthAddress;
  
  return (
    <div className="onchainkit-card profile-card">
      <div className="profile-header">
        {_hasError ? (
          <div className="avatar-fallback">
            <img 
              src={`https://effigy.im/a/${address}.svg`} 
              alt={`Address ${address.slice(0, 6)}...${address.slice(-4)}`} 
              className="avatar-image" 
            />
          </div>
        ) : (
          <Avatar 
            address={safeAddress}
            chain={baseSepolia}
            className="avatar-image"
            onError={() => setHasError(true)}
          />
        )}
        <div className="profile-details">
          <h3>
            {_hasError ? 
              `${address.slice(0, 6)}...${address.slice(-4)}` : 
              <Name 
                address={safeAddress}
                chain={baseSepolia} 
                onError={() => setHasError(true)} 
              />
            }
          </h3>
          <code className="address">{`${address.slice(0, 6)}...${address.slice(-4)}`}</code>
        </div>
      </div>
      <div className="profile-actions">
        <button className="onchainkit-button">View Profile</button>
        <button className="onchainkit-button secondary">Follow</button>
      </div>
    </div>
  );
};

// Enhanced profile card using hooks with error handling
const EnhancedProfileCard = ({ address }: { address: string }) => {
  const safeAddress = address as EthAddress;
  
  const { data: name, isLoading: nameIsLoading, error: nameError } = useName({ 
    address: safeAddress, 
    chain: baseSepolia,
  });
  
  const { data: avatar, isLoading: avatarIsLoading, error: avatarError } = useAvatar({ 
    ensName: safeAddress,
    chain: baseSepolia,
  });
  
  const _hasError = nameError || avatarError;
  
  return (
    <div className="onchainkit-card enhanced-profile-card">
      <div className="glow-effect"></div>
      <div className="enhanced-profile-header">
        {avatarIsLoading ? (
          <div className="avatar-skeleton"></div>
        ) : (
          <img 
            src={avatar || `https://effigy.im/a/${address}.svg`} 
            alt={name || address} 
            className="enhanced-avatar"
          />
        )}
        <div className="enhanced-profile-details">
          {nameIsLoading ? (
            <div className="name-skeleton"></div>
          ) : (
            <h3>{name || `${address.slice(0, 6)}...${address.slice(-4)}`}</h3>
          )}
          <code className="enhanced-address">{`${address.slice(0, 6)}...${address.slice(-4)}`}</code>
        </div>
      </div>
      <div className="enhanced-profile-body">
        <div className="stats">
          <div className="stat">
            <span className="stat-value">247</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat">
            <span className="stat-value">1.2K</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat">
            <span className="stat-value">38</span>
            <span className="stat-label">Collections</span>
          </div>
        </div>
      </div>
      <div className="enhanced-profile-actions">
        <button className="onchainkit-button primary">Connect</button>
        <button className="onchainkit-button secondary">View Activity</button>
      </div>
    </div>
  );
};

// Basename Lookup component using utility functions with enhanced error handling
const BasenameLookup = () => {
  const [searchAddress, setSearchAddress] = useState('');
  const [searchResults, setSearchResults] = useState<{name: string | null, avatar: string | null} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!searchAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Add delay to avoid rate limiting
      const delayPromise = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Get name with retry logic and timeout
      const getNameWithRetry = async (retries = 3): Promise<string | null> => {
        try {
          return await Promise.race([
            getName({ address: searchAddress as EthAddress, chain: baseSepolia }), // Switch to Base Sepolia testnet
            delayPromise(5000).then(() => { throw new Error('Request timeout'); }) // 5 second timeout
          ]);
        } catch (err) {
          if (retries > 0) {
            await delayPromise(1000); // Wait 1 second between retries
            return getNameWithRetry(retries - 1);
          }
          console.error('Error in getName:', err);
          return null;
        }
      };
      
      // Get avatar with retry logic and timeout
      const getAvatarWithRetry = async (retries = 3): Promise<string | null> => {
        try {
          return await Promise.race([
            getAvatar({ ensName: searchAddress as EthAddress, chain: baseSepolia }), // Switch to Base Sepolia testnet
            delayPromise(5000).then(() => { throw new Error('Request timeout'); }) // 5 second timeout
          ]);
        } catch (err) {
          if (retries > 0) {
            await delayPromise(1000); // Wait 1 second between retries
            return getAvatarWithRetry(retries - 1);
          }
          console.error('Error in getAvatar:', err);
          return null;
        }
      };
      
      // Run queries sequentially to avoid rate limiting
      const name = await getNameWithRetry();
      await delayPromise(500); // Small delay between requests
      const avatar = await getAvatarWithRetry();
      
      setSearchResults({ name, avatar });
    } catch (err) {
      console.error('Error looking up address:', err);
      setError('Error fetching Basename information. Please try again later.');
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="onchainkit-card lookup-card">
      <h3 className="lookup-title">Basename Lookup</h3>
      <div className="lookup-form">
        <input
          type="text"
          className="onchainkit-input"
          placeholder="Enter Ethereum address"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
        />
        <button 
          className="onchainkit-button lookup-button" 
          onClick={handleLookup}
          disabled={isLoading || !searchAddress}
        >
          {isLoading ? 'Searching...' : 'Lookup'}
        </button>
      </div>
      
      {error && <div className="lookup-error">{error}</div>}
      
      {searchResults && (
        <div className="lookup-results">
          <div className="result-header">
            <img 
              src={searchResults.avatar || `https://effigy.im/a/${searchAddress}.svg`} 
              alt={searchResults.name || searchAddress} 
              className="result-avatar"
            />
            <div className="result-details">
              <h4>{searchResults.name || 'No Basename found'}</h4>
              <code>{`${searchAddress.slice(0, 6)}...${searchAddress.slice(-4)}`}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Basename Explorer Component
export default function BasenameExplorer() {
  const [randomAddress, setRandomAddress] = useState<string>(FEATURED_ADDRESSES[0]);
  
  useEffect(() => {
    // Rotate through featured addresses every 15 seconds
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * FEATURED_ADDRESSES.length);
      setRandomAddress(FEATURED_ADDRESSES[randomIndex]);
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="basename-explorer-container">
      <div className="explorer-header">
        <h1>Basename Explorer</h1>
        <p>Discover and explore identities on Base</p>
      </div>
      
      <div className="explorer-featured">
        <h2>Featured Profile</h2>
        <EnhancedProfileCard address={randomAddress} />
      </div>
      
      <div className="explorer-gallery">
        <h2>Community Profiles</h2>
        <div className="profile-grid">
          {FEATURED_ADDRESSES.map((address) => (
            <ProfileCard key={address} address={address} />
          ))}
        </div>
      </div>
      
      <div className="explorer-lookup">
        <BasenameLookup />
      </div>
    </div>
  );
} 