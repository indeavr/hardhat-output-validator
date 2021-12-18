// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/// @title An Example Foo
/// @dev Example Details Foo
interface IFoo {
    /// @notice Returns the nonce of an address
    /// @dev Nonces much
    /// @param _0 Address to inspect
    /// @return Current nonce of the address
    function nonces(address _0) external view returns (uint256);
}


contract Foo is IFoo {
    /// @inheritdoc IFoo
    mapping(address => uint256) public override nonces;
}
