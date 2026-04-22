// marketplace\apps\shop\src\app\components\home\home.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MmoItem {
  id: string;
  name: string;
  type: 'Arme' | 'Armure' | 'Ressource' | 'Skin';
  rarity: 'Commune' | 'Rare' | 'Epique' | 'Légendaire';
  price: number;
  stats: string[];
  seller: string;
  imageUrl: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  // Monnaie in-game (Token)
  userBalance: number = 250;
  tokenName: string = 'KamasToken (KT)';

  // Les objets en vente dans l'HDV
  marketplaceItems: MmoItem[] = [
    {
      id: '1',
      name: 'Épée du Jugement',
      type: 'Arme',
      rarity: 'Légendaire',
      price: 1500,
      stats: ['+150 Force', '+20 Coups Critiques', 'Appartient au Set du Jugement'],
      seller: '0x3F...7B9',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/3782/3782006.png'
    },
    {
      id: '2',
      name: 'Plastron en Cuir de Bouftou',
      type: 'Armure',
      rarity: 'Commune',
      price: 15,
      stats: ['+20 Vitalité', '+5 Résistance Terre'],
      seller: '0xA1...4C2',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/3782/3782260.png'
    },
    {
      id: '3',
      name: 'Bois de Chêne Magique',
      type: 'Ressource',
      rarity: 'Rare',
      price: 45,
      stats: ['Ressource de craft', 'Origine vérifiée'],
      seller: '0x99...1F1',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/3781/3781985.png'
    },
    {
      id: '4',
      name: 'Cape de l\'Aventurier Sombre',
      type: 'Skin',
      rarity: 'Epique',
      price: 350,
      stats: ['Cosmétique', 'Aucun bonus de combat'],
      seller: '0x88...D2A',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/11244/11244431.png'
    }
  ];

  // Le mini-jeu clicker pour gagner la monnaie du jeu
  farmTokens() {
    const minGain = 5;
    const maxGain = 25;
    const gain = Math.floor(Math.random() * (maxGain - minGain + 1)) + minGain;
    this.userBalance += gain;
  }

  buyItem(item: MmoItem) {
    if (this.userBalance >= item.price) {
      if (confirm(`Voulez-vous vraiment signer la transaction pour ${item.name} ?`)) {
        this.userBalance -= item.price;
        alert(`Transaction réussie (Smart Contract simulé) ! Vous possédez maintenant : ${item.name}`);
        this.marketplaceItems = this.marketplaceItems.filter(i => i.id !== item.id);
      }
    } else {
      alert(`Fonds insuffisants ! Utilisez le clicker pour gagner plus de ${this.tokenName}.`);
    }
  }
}
