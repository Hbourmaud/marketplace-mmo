// marketplace\apps\shop\src\app\components\home\home.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Web3Service } from '../../services/web3.service';

export interface MmoItem {
  id: string;
  itemId: string;
  name: string;
  type: 'Arme' | 'Armure' | 'Ressource' | 'Skin';
  rarity: 'Commune' | 'Rare' | 'Epique' | 'Légendaire';
  price: number;
  amount: number;
  stats: string[];
  seller: string;
  imageUrl: string;
}

export interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'tx';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  web3Service = inject(Web3Service);

  // States
  userAddress = signal<string | null>(null);
  kamasBalance = signal<string>('0');

  isMining = signal<boolean>(false);
  isProcessingTx = signal<boolean>(false);
  isLoadingMarket = signal<boolean>(true);

  marketplaceItems = signal<MmoItem[]>([]);

  // NOUVEAU: Le tableau de logs pour l'UI
  appLogs = signal<LogEntry[]>([]);

  tokenName: string = 'KamasToken (KT)';

  private itemMetadata: Record<string, any> = {
    '1': { name: 'Épée du Jugement', type: 'Arme', rarity: 'Légendaire', stats: ['+150 Force', '+20 Coups Critiques'], imageUrl: 'https://cdn-icons-png.flaticon.com/512/3782/3782006.png' },
    '2': { name: 'Bois de Chêne Magique', type: 'Ressource', rarity: 'Rare', stats: ['Ressource de craft', 'Vérifiée'], imageUrl: 'https://cdn-icons-png.flaticon.com/512/3781/3781985.png' },
    '3': { name: 'Potion de Soin Mineure', type: 'Ressource', rarity: 'Commune', stats: ['Restaure 50 PV'], imageUrl: 'https://cdn-icons-png.flaticon.com/512/8673/8673898.png' }
  };

  async ngOnInit() {
    // Écoute les logs du Web3Service
    this.web3Service.logs$.subscribe(log => {
      const newLog = {
        time: new Date().toLocaleTimeString(),
        message: log.message,
        type: log.type
      };
      // Garde les 50 derniers logs
      this.appLogs.update(logs => [newLog, ...logs].slice(0, 50));
    });

    this.web3Service.account$.subscribe(async (address) => {
      this.userAddress.set(address);
      if (address) {
        await this.refreshBalance();
      } else {
        this.kamasBalance.set('0');
      }
    });

    await this.loadMarketplaceItems();
  }

  async connectWallet() {
    await this.web3Service.connectWallet();
  }

  async refreshBalance() {
    if (this.userAddress()) {
      const balance = await this.web3Service.getKamasBalance(this.userAddress()!);
      this.kamasBalance.set(balance);
    }
  }

  async farmTokens() {
    if (!this.userAddress()) {
      alert("Veuillez connecter MetaMask d'abord !");
      return;
    }

    const gain = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
    this.isMining.set(true);

    try {
      const success = await this.web3Service.mineTokens(gain);
      if (success) {
        await this.refreshBalance();
      }
    } finally {
      this.isMining.set(false);
    }
  }

  async loadMarketplaceItems() {
    this.isLoadingMarket.set(true);
    try {
      const activeListings = await this.web3Service.getActiveListings();

      const hydratedItems = activeListings.map(listing => {
        const meta = this.itemMetadata[listing.itemId] || {
          name: 'Objet Inconnu', type: 'Ressource', rarity: 'Commune', stats: [], imageUrl: 'https://cdn-icons-png.flaticon.com/512/1030/1030005.png'
        };

        return {
          id: listing.listingId,
          itemId: listing.itemId,
          amount: listing.amount,
          seller: listing.seller,
          price: listing.price,
          ...meta
        };
      });

      this.marketplaceItems.set(hydratedItems);
    } finally {
      this.isLoadingMarket.set(false);
    }
  }

  async buyItem(item: MmoItem) {
    if (!this.userAddress()) return;

    if (Number(this.kamasBalance()) < item.price) {
      alert(`Fonds insuffisants ! Utilisez le clicker.`);
      return;
    }

    this.isProcessingTx.set(true);
    try {
      const success = await this.web3Service.buyMarketplaceItem(Number(item.id), item.price, 1);
      if (success) {
        await this.loadMarketplaceItems();
        await this.refreshBalance();
      }
    } finally {
      this.isProcessingTx.set(false);
    }
  }

  // Vide la fenêtre de logs
  clearLogs() {
    this.appLogs.set([]);
  }
}
