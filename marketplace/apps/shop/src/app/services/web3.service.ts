// marketplace\apps\shop\src\app\services\web3.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Web3Service {
  private accountSubject = new BehaviorSubject<string | null>(null);
  public account$ = this.accountSubject.asObservable();

  private provider: BrowserProvider | null = null;

  // IMPORTANT: Remplacez par vos vraies adresses de contrats déployés sur Remix/Ganache !
  private readonly KAMAS_TOKEN_ADDRESS = '';
  private readonly MARKETPLACE_ADDRESS = '';

  // ABI simplifiée pour interagir avec notre ERC20 (KamasToken)
  private readonly KAMAS_TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function rewardPlayer(address player, uint256 amount) public",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  // ABI complète pour interagir avec notre Marketplace
  private readonly MARKETPLACE_ABI = [
    "function listings(uint256) view returns (address seller, uint256 itemId, uint256 amount, uint256 pricePerUnit)",
    "function nextListingId() view returns (uint256)",
    "function buyItem(uint256 _listingId, uint256 _amountToBuy) external"
  ];

  // Le constructeur vérifie si on est côté navigateur (Angular SSR) et initialise Ethers
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const ethereum = (window as any).ethereum;

      if (ethereum) {
        this.provider = new BrowserProvider(ethereum);

        // Écoute les changements de compte dans MetaMask
        ethereum.on('accountsChanged', (accounts: string[]) => {
          this.accountSubject.next(accounts.length > 0 ? accounts[0] : null);
        });
      } else {
        console.warn("MetaMask n'est pas détecté dans le navigateur.");
      }
    }
  }

  // 1. CONNECTER LE WALLET
  async connectWallet(): Promise<string | null> {
    if (!this.provider) {
      alert("Veuillez installer l'extension MetaMask !");
      return null;
    }

    try {
      const accounts = await this.provider.send('eth_requestAccounts', []);
      this.accountSubject.next(accounts[0]);
      return accounts[0];
    } catch (error) {
      console.error("Erreur de connexion MetaMask:", error);
      return null;
    }
  }

  // 2. LIRE LE SOLDE DU JOUEUR (Read Call - Gratuit)
  async getKamasBalance(accountAddress: string): Promise<string> {
    if (!this.provider) return '0';

    try {
      const contract = new Contract(this.KAMAS_TOKEN_ADDRESS, this.KAMAS_TOKEN_ABI, this.provider);
      const rawBalance = await contract['balanceOf'](accountAddress);
      const decimals = await contract['decimals']();

      return formatUnits(rawBalance, decimals);
    } catch (error) {
      console.error("Erreur lecture de la balance:", error);
      return '0';
    }
  }

  // 3. MINER DES TOKENS (Transaction - Coûte du Gas)
  async mineTokens(amount: number): Promise<boolean> {
    if (!this.provider || !this.accountSubject.value) return false;

    try {
      const signer = await this.provider.getSigner();
      const contract = new Contract(this.KAMAS_TOKEN_ADDRESS, this.KAMAS_TOKEN_ABI, signer);

      console.log(`Signature demandée à MetaMask pour miner ${amount} KT...`);
      const tx = await contract['rewardPlayer'](this.accountSubject.value, amount);

      console.log("Transaction envoyée. Hash:", tx.hash);
      await tx.wait(); // Attend la validation du bloc
      console.log("Transaction de minage confirmée !");

      return true;
    } catch (error) {
      console.error("Erreur ou rejet lors du minage:", error);
      return false;
    }
  }

  // 4. ACHETER UN OBJET DANS LA MARKETPLACE (Approve + Purchase)
  async buyMarketplaceItem(listingId: number, priceInKamas: number, amountToBuy: number = 1): Promise<boolean> {
    if (!this.provider || !this.accountSubject.value) return false;

    try {
      const signer = await this.provider.getSigner();

      const tokenContract = new Contract(this.KAMAS_TOKEN_ADDRESS, this.KAMAS_TOKEN_ABI, signer);
      const marketContract = new Contract(this.MARKETPLACE_ADDRESS, this.MARKETPLACE_ABI, signer);

      const decimals = await tokenContract['decimals']();
      // On convertit le prix (ex: 15) en Wei (15 * 10^18) pour la blockchain
      const priceInWei = parseUnits(priceInKamas.toString(), decimals);
      const totalPrice = priceInWei * BigInt(amountToBuy);

      // ÉTAPE 1 : APPROBATION (Autoriser le contrat Marketplace à dépenser nos tokens)
      console.log(`Vérification de l'Allowance (autorisation de dépenser le token)...`);
      const currentAllowance = await tokenContract['allowance'](this.accountSubject.value, this.MARKETPLACE_ADDRESS);

      if (currentAllowance < totalPrice) {
        console.log(`Approbation demandée. Veuillez signer la transaction d'Approve dans MetaMask...`);
        const approveTx = await tokenContract['approve'](this.MARKETPLACE_ADDRESS, totalPrice);
        await approveTx.wait();
        console.log(`Approbation réussie !`);
      }

      // ÉTAPE 2 : L'ACHAT
      console.log(`Achat de l'objet HDV (listingId: ${listingId}). Veuillez signer la transaction d'Achat...`);
      const buyTx = await marketContract['buyItem'](listingId, amountToBuy);
      await buyTx.wait();

      console.log(`Achat confirmé ! Le NFT est transféré.`);
      return true;

    } catch (error) {
      console.error("Erreur ou rejet lors de l'achat:", error);
      return false;
    }
  }

  // Add this inside web3.service.ts

  // 5. RECUPERER TOUS LES OBJETS EN VENTE SUR LA BLOCKCHAIN
  async getActiveListings(): Promise<any[]> {
    if (!this.provider) return [];

    try {
      const marketContract = new Contract(this.MARKETPLACE_ADDRESS, this.MARKETPLACE_ABI, this.provider);

      // 1. Get the total number of listings ever created
      const totalListings = await marketContract['nextListingId']();
      const listingsCount = Number(totalListings);

      const activeListings = [];

      // 2. Loop through all listings (0 to totalListings - 1)
      for (let i = 0; i < listingsCount; i++) {
        const listing = await marketContract['listings'](i);

        // listing returns a tuple: [seller, itemId, amount, pricePerUnit]
        const amount = Number(listing.amount);

        // 3. Only keep listings that haven't been fully bought out
        if (amount > 0) {
          activeListings.push({
            listingId: i.toString(),
            seller: listing.seller,
            itemId: listing.itemId.toString(),
            amount: amount,
            // Convert price from Wei back to readable Kamas (e.g. 1500)
            price: Number(formatUnits(listing.pricePerUnit, 18)) // Assuming 18 decimals
          });
        }
      }

      return activeListings;
    } catch (error) {
      console.error("Erreur lors de la récupération des annonces:", error);
      return [];
    }
  }
}
