// marketplace\apps\shop\src\app\components\home\home.ts

import { Component, OnInit, inject, signal, effect } from '@angular/core';
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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  web3Service = inject(Web3Service);

  // 🔴 CONVERSION TO SIGNALS 🔴
  userAddress = signal<string | null>(null);
  kamasBalance = signal<string>('0');

  isMining = signal<boolean>(false);
  isProcessingTx = signal<boolean>(false);
  isLoadingMarket = signal<boolean>(true);

  marketplaceItems = signal<MmoItem[]>([]);

  tokenName: string = 'KamasToken (KT)';

  private itemMetadata: Record<string, any> = {
    '1': { name: 'Épée du Jugement', type: 'Arme', rarity: 'Légendaire', stats: ['+150 Force', '+20 Coups'], imageUrl: 'https://cdn-icons-png.flaticon.com/512/3782/3782006.png' },
    '2': { name: 'Bois de Chêne Magique', type: 'Ressource', rarity: 'Rare', stats: ['Ressource de craft', 'Vérifiée'], imageUrl: 'https://cdn-icons-png.flaticon.com/512/3781/3781985.png' },
    '3': { name: 'Potion de Soin Mineure', type: 'Ressource', rarity: 'Commune', stats: ['Restaure 50 PV', 'Consommable'], imageUrl: 'https://cdn-icons-png.flaticon.com/512/8673/8673898.png' }
  };

  async ngOnInit() {
    this.web3Service.account$.subscribe(async (address) => {
      this.userAddress.set(address); // Update Signal
      if (address) {
        await this.refreshBalance();
      } else {
        this.kamasBalance.set('0'); // Update Signal
      }
    });

    await this.loadMarketplaceItems();
  }

  async connectWallet() {
    await this.web3Service.connectWallet();
  }

  async refreshBalance() {
    const address = this.userAddress();
    if (address) {
      const balance = await this.web3Service.getKamasBalance(address);
      this.kamasBalance.set(balance); // Trigger UI update!
    } // Ensure closure ends correctly here
  }

  async farmTokens() {
    if (!this.userAddress()) {
      alert("Veuillez connecter MetaMask d'abord !");
      return;
    }

    const gain = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;

    this.isMining.set(true); // Disable button immediately
    try {
      const success = await this.web3Service.mineTokens(gain);
      if (success) {
        await this.refreshBalance();
        alert(`Vous avez miné ${gain} ${this.tokenName}.`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.isMining.set(false); // Re-enable button
    }
  }

  async loadMarketplaceItems() {
    this.isLoadingMarket.set(true);
    try {
      const activeListings = await this.web3Service.getActiveListings();

      const hydratedItems = activeListings.map(listing => {
        const meta = this.itemMetadata[listing.itemId] || {
          name: 'Objet Inconnu', type: 'Ressource', rarity: 'Commune', stats: [], imageUrl: 'https://via.placeholder.com/150'
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

      // Update array via Signal, telling Angular exactly what changed visually
      this.marketplaceItems.set(hydratedItems);

    } catch (error) {
      console.error(error);
    } finally {
      this.isLoadingMarket.set(false);
    }
  }

  async buyItem(item: MmoItem) {
    if (!this.userAddress()) return;

    if (Number(this.kamasBalance()) < item.price) {
      alert(`Fonds insuffisants ! Il vous faut ${item.price} KT.`);
      return;
    }

    if (!confirm(`Acheter 1x ${item.name} pour ${item.price} KT ? (2 signatures)`)) return;

    this.isProcessingTx.set(true); // Disable Buy buttons

    try {
      const success = await this.web3Service.buyMarketplaceItem(Number(item.id), item.price, 1);

      if (success) {
        alert(`Achat réussi !`);
        // Refresh exactly what changed!
        await this.loadMarketplaceItems();
        await this.refreshBalance();
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.isProcessingTx.set(false); // Re-enable buttons
    }
  }
}
