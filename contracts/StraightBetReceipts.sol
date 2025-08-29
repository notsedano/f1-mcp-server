// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * StraightBetReceipts
 * Minimal ERC-721 with a simple mintNFT(destination_wallet_address, metadata_uri) API.
 * The caller must mint to themselves to prevent third-party mints to arbitrary addresses.
 */
contract StraightBetReceipts is ERC721URIStorage {
    uint256 private _nextTokenId = 1;

    event Minted(address indexed to, uint256 indexed tokenId, string metadataURI);

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    /**
     * Mint a new NFT with provided metadata URI.
     * - destination_wallet_address: recipient and owner of the new token
     * - metadata_uri: HTTP(S) or ipfs:// URI pointing to JSON metadata
     */
    function mintNFT(address destination_wallet_address, string memory metadata_uri)
        external
        returns (uint256 tokenId)
    {
        require(msg.sender == destination_wallet_address, "Must mint to self");

        tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(destination_wallet_address, tokenId);
        _setTokenURI(tokenId, metadata_uri);

        emit Minted(destination_wallet_address, tokenId, metadata_uri);
    }
}


