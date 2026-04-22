// marketplace\apps\shop\src\app\services\web3.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Web3Service {
  private accountSubject = new BehaviorSubject<string | null>(null);
  public account$ = this.accountSubject.asObservable();

  // NOUVEAU : Un Subject pour envoyer des logs d'activité à l'UI
  private logsSubject = new Subject<{ message: string, type: 'info' | 'success' | 'error' | 'tx' }>();
  public logs$ = this.logsSubject.asObservable();

  private provider: BrowserProvider | null = null;

  // IMPORTANT: Mettez vos adresses de contrats locales Ganache ou Polygon Testnet
  private readonly KAMAS_TOKEN_ADDRESS = '';
  private readonly MARKETPLACE_ADDRESS = '';

  private readonly KAMAS_TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function rewardPlayer(address player, uint256 amount) public",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  private readonly MARKETPLACE_ABI = [
    "function listings(uint256) view returns (address seller, uint256 itemId, uint256 amount, uint256 pricePerUnit)",
    "function nextListingId() view returns (uint256)",
    "function buyItem(uint256 _listingId, uint256 _amountToBuy) external"
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const ethereum = (window as any).ethereum;
      if (ethereum) {
        this.provider = new BrowserProvider(ethereum);
        this.log("Web3Service initialisé. Fournisseur MetaMask détecté.", 'info');

        ethereum.on('accountsChanged', (accounts: string[]) => {
          const account = accounts.length > 0 ? accounts[0] : null;
          this.accountSubject.next(account);
          if (account) this.log(`Changement de compte détecté: ${account.substring(0, 6)}...`, 'info');
        });
      } else {
        this.log("MetaMask introuvable. Veuillez installer l'extension.", 'error');
      }
    }
  }

  // Helper interne pour envoyer des logs
  private log(message: string, type: 'info' | 'success' | 'error' | 'tx' = 'info') {
    this.logsSubject.next({ message, type });
  }

  async connectWallet(): Promise<string | null> {
    if (!this.provider) {
      this.log("Échec de connexion : MetaMask non trouvé.", 'error');
      return null;
    }

    try {
      this.log("Demande de connexion envoyée à MetaMask...", 'info');
      const accounts = await this.provider.send('eth_requestAccounts', []);
      this.accountSubject.next(accounts[0]);
      this.log(`Connecté avec succès : ${accounts[0]}`, 'success');
      return accounts[0];
    } catch (error: any) {
      this.log(`Erreur de connexion : ${error.message || 'Rejetée par l\'utilisateur'}`, 'error');
      return null;
    }
  }

  async getKamasBalance(accountAddress: string): Promise<string> {
    if (!this.provider) return '0';
    try {
      const contract = new Contract(this.KAMAS_TOKEN_ADDRESS, this.KAMAS_TOKEN_ABI, this.provider);
      const rawBalance = await contract['balanceOf'](accountAddress);
      const decimals = await contract['decimals']();
      return formatUnits(rawBalance, decimals);
    } catch (error: any) {
      this.log(`Erreur lecture solde: ${error.message || 'Contrat introuvable'}`, 'error');
      return '0';
    }
  }

  async mineTokens(amount: number): Promise<boolean> {
    if (!this.provider || !this.accountSubject.value) return false;

    try {
      const signer = await this.provider.getSigner();
      const contract = new Contract(this.KAMAS_TOKEN_ADDRESS, this.KAMAS_TOKEN_ABI, signer);

      this.log(`[CLICKER] Préparation du minage de ${amount} KT... Attente de la signature.`, 'info');

      const tx = await contract['rewardPlayer'](this.accountSubject.value, amount);
      this.log(`[CLICKER] Tx envoyée! Hash: ${tx.hash.substring(0, 10)}... Attente du bloc.`, 'tx');

      await tx.wait();

      // LOG ENHANCEMENT: Added sender (contract), receiver (user), amount and transaction hash
      const sender = this.KAMAS_TOKEN_ADDRESS.substring(0, 6);
      const receiver = this.accountSubject.value.substring(0, 6);
      this.log(`[CLICKER] Confirmé ! De: ${sender}... | À: ${receiver}... | Montant: +${amount} KT | Hash: ${tx.hash}`, 'success');

      return true;
    } catch (error: any) {
      this.log(`[CLICKER] Erreur/Rejet: ${error.info?.error?.message || error.message}`, 'error');
      return false;
    }
  }

  async buyMarketplaceItem(listingId: number, priceInKamas: number, amountToBuy: number = 1): Promise<boolean> {
    if (!this.provider || !this.accountSubject.value) return false;

    try {
      const signer = await this.provider.getSigner();
      const tokenContract = new Contract(this.KAMAS_TOKEN_ADDRESS, this.KAMAS_TOKEN_ABI, signer);
      const marketContract = new Contract(this.MARKETPLACE_ADDRESS, this.MARKETPLACE_ABI, signer);

      const decimals = await tokenContract['decimals']();
      const priceInWei = parseUnits(priceInKamas.toString(), decimals);
      const totalPrice = priceInWei * BigInt(amountToBuy);

      // Étape 1 : Allowance (Approve)
      this.log(`[ACHAT] Vérification de l'autorisation de dépenser ${priceInKamas} KT...`, 'info');
      const currentAllowance = await tokenContract['allowance'](this.accountSubject.value, this.MARKETPLACE_ADDRESS);

      if (currentAllowance < totalPrice) {
        this.log(`[ACHAT] Autorisation requise. Veuillez signer l'Approve() dans MetaMask.`, 'info');
        const approveTx = await tokenContract['approve'](this.MARKETPLACE_ADDRESS, totalPrice);
        this.log(`[ACHAT] Approve Tx envoyée (${approveTx.hash.substring(0, 10)}...). Attente...`, 'tx');
        await approveTx.wait();

        // LOG ENHANCEMENT: Added allowance amount & partial TxHash
        this.log(`[ACHAT] Approve Confirmé ! Le contrat (${this.MARKETPLACE_ADDRESS.substring(0, 6)}...) est maintenant autorisé. Hash: ${approveTx.hash}`, 'success');
      } else {
        this.log(`[ACHAT] Autorisation déjà existante. Passage direct à l'achat.`, 'info');
      }

      // Étape 2 : Achat (buyItem)
      this.log(`[ACHAT] Veuillez signer la transaction d'achat finale pour l'item...`, 'info');
      const buyTx = await marketContract['buyItem'](listingId, amountToBuy);
      this.log(`[ACHAT] Achat Tx envoyée (${buyTx.hash.substring(0, 10)}...). En cours de minage...`, 'tx');

      await buyTx.wait();

      // LOG ENHANCEMENT: Added Buyer address, Contract Address, amount spent, and full transaction hash
      const buyer = this.accountSubject.value.substring(0);
      const contractId = this.MARKETPLACE_ADDRESS.substring(0);
      const amountSpent = priceInKamas * amountToBuy;

      this.log(`[ACHAT] Confirmé ! Acheteur: ${buyer}... | Contrat: ${contractId}... | Dépense: -${amountSpent} KT | Hash: ${buyTx.hash}`, 'success');

      return true;

    } catch (error: any) {
      this.log(`[ACHAT] Échec: ${error.info?.error?.message || error.message || 'Transaction révertie'}`, 'error');
      return false;
    }
  }

  async getActiveListings(): Promise<any[]> {
    if (!this.provider) return [];
    try {
      this.log(`[HDV] Requête réseau: Récupération des objets depuis la blockchain...`, 'info');
      const marketContract = new Contract(this.MARKETPLACE_ADDRESS, this.MARKETPLACE_ABI, this.provider);

      const totalListings = await marketContract['nextListingId']();
      const listingsCount = Number(totalListings);
      const activeListings = [];

      for (let i = 0; i < listingsCount; i++) {
        const listing = await marketContract['listings'](i);
        const amount = Number(listing.amount);
        if (amount > 0) {
          activeListings.push({
            listingId: i.toString(),
            seller: listing.seller,
            itemId: listing.itemId.toString(),
            amount: amount,
            price: Number(formatUnits(listing.pricePerUnit, 18))
          });
        }
      }
      this.log(`[HDV] Synchronisation terminée: ${activeListings.length} objets trouvés.`, 'success');
      return activeListings;
    } catch (error: any) {
      this.log(`[HDV] Erreur de lecture du contrat: ${error.message}`, 'error');
      return [];
    }
  }
}
