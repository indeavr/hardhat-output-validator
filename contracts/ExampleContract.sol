pragma solidity 0.8.10;

import "./IExampleContract.sol";
import "./BaseContract.sol";

contract ExampleContract is IExampleContract, BaseContract {
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

    /**
      * @notice  Documented ?
     */
    function extraFunc(address first, uint second) external payable returns (address){
        return address(0);
    }

    /// Documented with no params
    /// @param first The first arg
    /// @return a The first returns arg
    /// @return {uint} The second returns arg
    function extraFuncSecond(address first, uint second) external payable returns (uint a, uint){
        return (42, 42);
    }
}
