pragma solidity 0.8.10;

import "./IExampleContract.sol";

contract ExampleContract is IExampleContract {
    function doSomething(address a, uint256 b) external returns (
        uint256 foo,
        uint256 bar
    ) {
        return (4, 2);
    }

    function pay() external payable {

    }

    function anotherThing(uint256 num) external pure returns (uint256){
        return 5;
    }

    function boop() external view returns (address){
        return address(0);
    }
}
