// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts@4.8.0/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts@4.8.0/token/ERC20/IERC20.sol";

contract Marketplace {
    IERC1155 public gameItems;
    IERC20 public paymentToken;

    struct Listing {
        address seller;
        uint256 itemId;
        uint256 amount;
        uint256 pricePerUnit; 
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    constructor(address _gameItemsAddress, address _paymentTokenAddress) {
        gameItems = IERC1155(_gameItemsAddress);
        paymentToken = IERC20(_paymentTokenAddress);
    }

    function listItem(uint256 _itemId, uint256 _amount, uint256 _pricePerUnit) external {
        require(_amount > 0, "Amount must be > 0");
        require(_pricePerUnit > 0, "Price must be > 0");
        require(gameItems.balanceOf(msg.sender, _itemId) >= _amount, "Not enough items");
        require(gameItems.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        listings[nextListingId] = Listing(msg.sender, _itemId, _amount, _pricePerUnit);
        nextListingId++;
    }

    function buyItem(uint256 _listingId, uint256 _amountToBuy) external {
        Listing storage listing = listings[_listingId];

        require(listing.amount > 0, "Listing does not exist");
        require(listing.amount >= _amountToBuy, "Not enough items listed");
        require(msg.sender != listing.seller, "Cannot buy your own item");

        uint256 totalPrice = listing.pricePerUnit * _amountToBuy;

        require(paymentToken.transferFrom(msg.sender, listing.seller, totalPrice), "Payment failed");

        gameItems.safeTransferFrom(listing.seller, msg.sender, listing.itemId, _amountToBuy, "");

        listing.amount -= _amountToBuy;

        // Supprime le listing si vide
        if (listing.amount == 0) {
            delete listings[_listingId];
        }
    }
}