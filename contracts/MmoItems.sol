// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts@4.8.0/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts@4.8.0/access/Ownable.sol";

contract MmoItems is ERC1155, Ownable {
    uint256 public constant EPEE_LEGENDAIRE = 1;
    uint256 public constant BOIS_CHENE = 2;
    uint256 public constant POTION_SOIN = 3;

    constructor() 
        ERC1155("http://localhost:3000/api/metadata/{id}.json") 
    {
        _mint(msg.sender, EPEE_LEGENDAIRE, 1, "");
        _mint(msg.sender, BOIS_CHENE, 1000, "");
        _mint(msg.sender, POTION_SOIN, 50, "");
    }
}