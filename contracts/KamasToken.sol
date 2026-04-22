// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts@4.8.0/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.8.0/access/Ownable.sol";

contract KamasToken is ERC20, Ownable {
    constructor() ERC20("KamasToken", "KT") {
        // Mint 1 million tokens to the creator (you) initially
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Function for your backend to reward players
    function rewardPlayer(address player, uint256 amount) public onlyOwner {
        _mint(player, amount * 10 ** decimals());
    }
}