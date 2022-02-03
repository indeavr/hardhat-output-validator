// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title An Example Bar
/// @dev Example Details Bar
interface IBar {
	/// @notice Notice of T
	/// @dev Dev of T
	/// @param paramA A number
	/// @param paramB An address
	struct T {
		uint256 paramA;
		address paramB;
	}

	function set(T memory t) external;

	function boop(uint256 bar) external;

	/// @notice Emitted when transfer
	/// @dev Transfer some stuff
	/// @param foo Amount of stuff
	event Transfer(uint256 foo);

	/// @notice Thrown when doh
	error Doh(bool yay);
}

/// @title   Bar contract
/// @author  Primitive
/// @notice  Manages the bar
/// @dev     Blablou
contract Bar is IBar, Ownable {

	/// @notice Buyer's address
	/// @return Buyer's address
	uint40 public buyerAddress;

	/// @notice Buyer's amounts
	/// @return Buyer's amounts for address
	mapping(address => uint) public buyerAmounts;


	/// @inheritdoc IBar
	function set(T memory t) external {}

	/// @notice Cool function bro
	function boop(uint256 bar) external {}

	/// @notice Baaps the yaps1
	/// @param bar1 Number of bar
	function baap(uint256 bar1) external {}

	/// @notice Baaps the yaps
	/// @param bar Number of bar
	/// @param aar Address of aar
	function baap(uint256 bar, address aar) external {}


}
