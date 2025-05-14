
The SpendSaveHook.sol
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {BaseHook} from "lib/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from
"lib/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "lib/v4-periphery/lib/v4-core/src/libraries/Hooks.sol";
import {BalanceDelta} from "lib/v4-periphery/lib/v4-core/src/types/BalanceDelta.sol";
import {PoolKey} from "lib/v4-periphery/lib/v4-core/src/types/PoolKey.sol";
import {IHooks} from "lib/v4-periphery/lib/v4-core/src/interfaces/IHooks.sol";
import {BeforeSwapDelta} from
"lib/v4-periphery/lib/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency} from "lib/v4-periphery/lib/v4-core/src/types/Currency.sol";
import {IERC20} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.
sol";
import {ReentrancyGuard} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/utils/ReentrancyGua
rd.sol";
import {
BeforeSwapDelta,
toBeforeSwapDelta
} from "lib/v4-periphery/lib/v4-core/src/types/BeforeSwapDelta.sol";
import {CurrencySettler} from
"lib/v4-periphery/lib/v4-core/test/utils/CurrencySettler.sol";
import "./SpendSaveStorage.sol";
import "./ISavingStrategyModule.sol";
import "./ISavingsModule.sol";
import "./IDCAModule.sol";
import "./ISlippageControlModule.sol";
import "./ITokenModule.sol";
import "./IDailySavingsModule.sol";
/**
* @title SpendSaveHook
* @author OneTrueHomie.sol
* @notice Main contract that implements Uniswap V4 hooks and coordinates between
modules
savings
*/
* @dev This contract handles savings strategies, DCA, slippage control and daily
contract SpendSaveHook is BaseHook, ReentrancyGuard {
using CurrencySettler for Currency;
/// @notice Storage contract reference
SpendSaveStorage public immutable storage_;
/// @notice Module references
ISavingStrategyModule public savingStrategyModule;
ISavingsModule public savingsModule;
IDCAModule public dcaModule;
ISlippageControlModule public slippageControlModule;
ITokenModule public tokenModule;
IDailySavingsModule public dailySavingsModule;
/// @notice Additional state variables
address public token;
address public savings;
address public savingStrategy;
address public yieldModule;
/// @notice Error definitions
error ModuleNotInitialized(string moduleName);
error InsufficientGas(uint256 available, uint256 required);
error UnauthorizedAccess(address caller);
error InvalidAddress();
/// @notice Events
event DailySavingsExecuted(address indexed user, uint256 totalAmount);
event DailySavingsDetails(address indexed user, address indexed token, uint256
amount);
event DailySavingsExecutionFailed(address indexed user, address indexed token,
string reason);
event SingleTokenSavingsExecuted(address indexed user, address indexed token,
uint256 amount);
event ModulesInitialized(address strategyModule, address savingsModule, address
dcaModule, address slippageModule, address tokenModule, address dailySavingsModule);
event BeforeSwapError(address indexed user, string reason);
event AfterSwapError(address indexed user, string reason);
event AfterSwapExecuted(address indexed user, BalanceDelta delta);
event OutputSavingsCalculated(
address indexed user,
address indexed token,
uint256 amount
);
event OutputSavingsProcessed(
address indexed user,
address indexed token,
uint256 amount
);
event SpecificTokenSwapQueued(
address indexed user,
address indexed fromToken,
address indexed toToken,
uint256 amount
);
event ExternalProcessingSavingsCall(address indexed caller);
/// @notice Gas configuration for daily savings
uint256 private constant GAS_THRESHOLD = 500000;
uint256 private constant INITIAL_GAS_PER_TOKEN = 150000;
uint256 private constant MIN_GAS_TO_KEEP = 100000;
uint256 private constant DAILY_SAVINGS_THRESHOLD = 600000;
uint256 private constant BATCH_SIZE = 5;
/// @notice Struct for processing daily savings
struct DailySavingsProcessor {
address[] tokens;
uint256 gasLimit;
uint256 totalSaved;
uint256 minGasReserve;
}
/// @notice Efficient data structure for tracking tokens that need processing
struct TokenProcessingQueue {
/// @dev Mapping from token address to position in the queue (1-based index, 0
means not in queue)
mapping(address => uint256) tokenPositions;
/// @dev Array of tokens in processing queue
address[] tokenQueue;
/// @dev Last processing timestamp for each token
mapping(address => uint256) lastProcessed;
}
/// @notice Mapping from user to token processing queue
mapping(address => TokenProcessingQueue) private _tokenProcessingQueues;
/**
* @notice Contract constructor
* @param _poolManager The Uniswap V4 pool manager contract
* @param _storage The storage contract for saving strategies
*/
constructor(
IPoolManager _poolManager,
SpendSaveStorage _storage
) BaseHook(_poolManager) {
storage_ = _storage;
}
/**
* @notice Initialize all modules after deployment
* @param _strategyModule Address of the saving strategy module
* @param _savingsModule Address of the savings module
* @param _dcaModule Address of the DCA module
* @param _slippageModule Address of the slippage control module
* @param _tokenModule Address of the token module
* @param _dailySavingsModule Address of the daily savings module
*/
function initializeModules(
address _strategyModule,
address _savingsModule,
address _dcaModule,
address _slippageModule,
address _tokenModule,
address _dailySavingsModule
) external virtual {
require(msg.sender == storage_.owner(), "Only owner can initialize modules");
// Only cache the references locally inside the hook. Registration in storage
must be
// carried out beforehand by the owner (deployment script) to avoid the
onlyOwner
// restriction inside SpendSaveStorage.
_storeModuleReferences(
_strategyModule,
_savingsModule,
_dcaModule,
_slippageModule,
_tokenModule,
_dailySavingsModule
);
emit ModulesInitialized(
_strategyModule,
_savingsModule,
_dcaModule,
_slippageModule,
_tokenModule,
_dailySavingsModule
);
}
// Separate helper to store module references
function _storeModuleReferences(
address _strategyModule,
address _savingsModule,
address _dcaModule,
address _slippageModule,
address _tokenModule,
address _dailySavingsModule
) internal {
savingStrategyModule = ISavingStrategyModule(_strategyModule);
savingsModule = ISavingsModule(_savingsModule);
dcaModule = IDCAModule(_dcaModule);
slippageControlModule = ISlippageControlModule(_slippageModule);
tokenModule = ITokenModule(_tokenModule);
dailySavingsModule = IDailySavingsModule(_dailySavingsModule);
}
/**
* @notice Defines which hook points are used by this contract
* @return Hooks.Permissions Permission configuration for the hook
* @dev Enables beforeSwap, afterSwap, and beforeSwapReturnDelta
*/
memory) {
function getHookPermissions() public pure override returns (Hooks.Permissions
return Hooks.Permissions({
beforeInitialize: false,
afterInitialize: false,
beforeAddLiquidity: false,
afterAddLiquidity: false,
beforeRemoveLiquidity: false,
afterRemoveLiquidity: false,
beforeSwap: true, // Enable beforeSwap
afterSwap: true, // Enable afterSwap
beforeDonate: false,
afterDonate: false,
beforeSwapReturnDelta: true, // Enable beforeSwapReturnsDelta
afterSwapReturnDelta: true,
afterAddLiquidityReturnDelta: false,
afterRemoveLiquidityReturnDelta: false
});
}
/**
* @notice Verifies that all modules are initialized - only when needed
* @dev Reverts if any module is not initialized
*/
function _checkModulesInitialized() internal view {
if (address(savingStrategyModule) == address(0)) revert
ModuleNotInitialized("SavingStrategy");
if (address(savingsModule) == address(0)) revert
ModuleNotInitialized("Savings");
if (address(dcaModule) == address(0)) revert ModuleNotInitialized("DCA");
if (address(slippageControlModule) == address(0)) revert
ModuleNotInitialized("SlippageControl");
if (address(tokenModule) == address(0)) revert ModuleNotInitialized("Token");
if (address(dailySavingsModule) == address(0)) revert
ModuleNotInitialized("DailySavings");
// Also check the yieldModule if it's used in any functions
// if (address(yieldModule) == address(0)) revert
ModuleNotInitialized("Yield");
}
// helper function to extract user identity
function _extractUserFromHookData(address sender, bytes calldata hookData) internal
pure returns (address) {
// If hook data contains at least 20 bytes (address size), try to decode it
if (hookData.length >= 32) { // Need at least 32 bytes for an address in ABI
encoding
// Basic validation that it's likely an address
address potentialUser = address(uint160(uint256(bytes32(hookData[:32]))));
if (potentialUser != address(0)) {
return potentialUser;
}
}
return sender;
}
/**
* @notice Implements the beforeSwap hook
* @param sender The address of the sender
* @param key The pool key
* @param params The swap parameters
* @param hookData Additional data for the hook
* @return bytes4 The selector for the hook
* @return BeforeSwapDelta The delta before the swap
* @return uint24 The custom slippage tolerance
*/
function _beforeSwap(
address sender,
PoolKey calldata key,
IPoolManager.SwapParams calldata params,
bytes calldata hookData
) internal virtual override nonReentrant returns (bytes4, BeforeSwapDelta, uint24)
{
// Extract actual user from hookData if available
address actualUser = _extractUserFromHookData(sender, hookData);
// Default to no adjustment (zero delta)
BeforeSwapDelta deltaBeforeSwap = toBeforeSwapDelta(0, 0);
// Only check modules if user has a strategy
if (_hasUserStrategy(actualUser)) {
_checkModulesInitialized();
// Try to execute beforeSwap and get the adjustment delta
try savingStrategyModule.beforeSwap(actualUser, key, params) returns
(BeforeSwapDelta delta) {
deltaBeforeSwap = delta;
} catch Error(string memory reason) {
emit BeforeSwapError(actualUser, reason);
} catch {
emit BeforeSwapError(actualUser, "Unknown error in beforeSwap");
}
}
return (IHooks.beforeSwap.selector, deltaBeforeSwap, 0);
}
// Try to execute beforeSwap with error handling
function _tryBeforeSwap(
address actualUser,
PoolKey calldata key,
IPoolManager.SwapParams calldata params
) internal returns (bool) {
try savingStrategyModule.beforeSwap(actualUser, key, params) {
return true;
} catch Error(string memory reason) {
emit BeforeSwapError(actualUser, reason);
return false;
} catch {
emit BeforeSwapError(actualUser, "Unknown error in beforeSwap");
return false;
}
}
// Check if user has a saving strategy
function _hasUserStrategy(address user) internal view returns (bool) {
(uint256 percentage,,,,,,, ) = storage_.getUserSavingStrategy(user);
return percentage > 0;
}
// Process savings based on token type - properly organized helper functions
function _processSavings(
address actualUser,
SpendSaveStorage.SwapContext memory context,
PoolKey calldata key,
BalanceDelta delta
) internal virtual {
if (!context.hasStrategy) return;
// Input token savings type handling - already processed in _afterSwap
if (context.savingsTokenType == SpendSaveStorage.SavingsTokenType.INPUT &&
context.pendingSaveAmount > 0) {
// Tokens have already been taken in _afterSwap via take()
try savingStrategyModule.processInputSavingsAfterSwap(actualUser, context)
{
// Success
} catch Error(string memory reason) {
emit AfterSwapError(actualUser, reason);
} catch {
emit AfterSwapError(actualUser, "Failed to process input savings");
}
// Update saving strategy
savingStrategyModule.updateSavingStrategy(actualUser, context);
return;
}
// Output token or specific token savings are handled by _processOutputSavings
// This is a fallback in case they weren't already processed
(address outputToken, uint256 outputAmount, bool isToken0) =
_getOutputTokenAndAmount(key, delta);
// Skip if no positive output
if (outputAmount == 0) return;
// Process based on token type - only if not already processed
if (context.savingsTokenType == SpendSaveStorage.SavingsTokenType.OUTPUT) {
_processOutputTokenSavings(actualUser, context, outputToken, outputAmount);
} else if (context.savingsTokenType ==
SpendSaveStorage.SavingsTokenType.SPECIFIC) {
_processSpecificTokenSavings(actualUser, context, outputToken,
outputAmount);
}
// Update saving strategy if using auto-increment
savingStrategyModule.updateSavingStrategy(actualUser, context);
}
// Helper for output token savings
function _processOutputTokenSavings(
address actualUser,
SpendSaveStorage.SwapContext memory context,
address outputToken,
uint256 outputAmount
) internal {
// Process savings from output token
savingsModule.processSavingsFromOutput(actualUser, outputToken, outputAmount,
context);
// Handle DCA if enabled
_processDCAIfEnabled(actualUser, context, outputToken);
// Add token to processing queue for future daily savings
_addTokenToProcessingQueue(actualUser, outputToken);
}
// Helper for specific token savings
function _processSpecificTokenSavings(
address actualUser,
SpendSaveStorage.SwapContext memory context,
address outputToken,
uint256 outputAmount
) internal {
// Process savings to specific token
savingsModule.processSavingsToSpecificToken(actualUser, outputToken,
outputAmount, context);
// Add specific token to processing queue
_addTokenToProcessingQueue(actualUser, context.specificSavingsToken);
}
// Helper function to handle DCA processing
function _processDCAIfEnabled(
address actualUser,
SpendSaveStorage.SwapContext memory context,
address outputToken
) internal {
bool shouldProcessDCA = context.enableDCA &&
context.dcaTargetToken != address(0) &&
outputToken != context.dcaTargetToken;
if (shouldProcessDCA) {
dcaModule.queueDCAFromSwap(actualUser, outputToken, context);
}
}
/**
* @notice Hook function called after a Uniswap V4 swap to process savings and
check daily savings
* @dev This function handles saving input tokens, output tokens, and specific
token savings
* @param sender The address initiating the swap
* @param key The Uniswap V4 pool key containing token and fee information
* @param params The Uniswap V4 swap parameters containing amounts and direction
* @param delta The balance changes from the swap
* @param hookData Additional data passed to the hook, may contain actual user
address
* @return bytes4 The function selector to indicate successful hook execution
* @return int128 The delta adjustment to apply to output amounts for savings
* @custom:security nonReentrant Only one execution at a time
*/
function _afterSwap(
address sender,
PoolKey calldata key,
IPoolManager.SwapParams calldata params,
BalanceDelta delta,
bytes calldata hookData
) internal virtual override nonReentrant returns (bytes4, int128) {
// Extract actual user from hookData if available
address actualUser = _extractUserFromHookData(sender, hookData);
// Get swap context
SpendSaveStorage.SwapContext memory context =
storage_.getSwapContext(actualUser);
// HANDLE INPUT TOKEN SAVINGS
if (context.hasStrategy &&
context.savingsTokenType == SpendSaveStorage.SavingsTokenType.INPUT &&
context.pendingSaveAmount > 0) {
// Take the tokens that were saved from the swap
if (params.zeroForOne) {
// For zeroForOne swaps, input token is token0
key.currency0.take(
storage_.poolManager(),
address(this),
context.pendingSaveAmount,
false // Do not mint claim tokens to the hook
);
} else {
// For oneForZero swaps, input token is token1
key.currency1.take(
storage_.poolManager(),
address(this),
context.pendingSaveAmount,
false // Do not mint claim tokens to the hook
);
}
}
// HANDLE OUTPUT TOKEN SAVINGS
if (context.hasStrategy &&
(context.savingsTokenType == SpendSaveStorage.SavingsTokenType.OUTPUT ||
context.savingsTokenType == SpendSaveStorage.SavingsTokenType.SPECIFIC)) {
// Get output token based on swap direction
Currency outputCurrency;
address outputToken;
int256 outputAmount;
bool isToken0;
if (params.zeroForOne) {
// If swapping token0 → token1, output is token1
outputCurrency = key.currency1;
outputToken = Currency.unwrap(key.currency1);
outputAmount = delta.amount1();
isToken0 = false;
} else {
// If swapping token1 → token0, output is token0
outputCurrency = key.currency0;
outputToken = Currency.unwrap(key.currency0);
outputAmount = delta.amount0();
isToken0 = true;
}
// Only proceed if output is positive
if (outputAmount > 0) {
// Calculate savings amount (10% of output)
uint256 saveAmount = savingStrategyModule.calculateSavingsAmount(
uint256(outputAmount),
context.currentPercentage,
context.roundUpSavings
);
if (saveAmount > 0 && saveAmount <= uint256(outputAmount)) {
// Store saveAmount in context
context.pendingSaveAmount = saveAmount;
storage_.setSwapContext(actualUser, context);
// CRITICAL FIX 1: Enable claim tokens when taking currency
outputCurrency.take(
poolManager,
address(this),
saveAmount,
true // ENABLE claim tokens for proper settlement
);
// Process savings
_processOutputSavings(actualUser, context, key, outputToken,
isToken0);
// CRITICAL FIX 2: Return POSITIVE delta to properly account for
taken tokens
// This tells Uniswap we're taking these tokens from the user's
output
return (IHooks.afterSwap.selector, int128(int256(saveAmount)));
}
}
}
// Handle other logic without using try/catch
bool success = _executeAfterSwapLogic(actualUser, key, params, delta);
if (!success) {
emit AfterSwapError(actualUser, "Error in afterSwap execution");
}
return (IHooks.afterSwap.selector, 0);
}
// NEW HELPER: Process output savings tokens that were kept by afterSwapReturnDelta
function _processOutputSavings(
address actualUser,
SpendSaveStorage.SwapContext memory context,
PoolKey calldata key,
address outputToken,
bool isToken0
) internal virtual {
uint256 saveAmount = context.pendingSaveAmount;
// For SPECIFIC token savings type
address tokenToSave = outputToken;
bool swapQueued = false;
// Check if we need to swap to a specific token
if (context.savingsTokenType == SpendSaveStorage.SavingsTokenType.SPECIFIC &&
context.specificSavingsToken != address(0) &&
context.specificSavingsToken != outputToken) {
// Approve DCA module to spend our tokens
IERC20(outputToken).approve(address(dcaModule), saveAmount);
// Create a pool key for the swap from output token to specific token
PoolKey memory poolKeyForDCA = storage_.createPoolKey(outputToken,
context.specificSavingsToken);
// Get current tick for the pool
int24 currentTick = dcaModule.getCurrentTick(poolKeyForDCA);
// Try to queue a DCA execution for this token with proper pool key and
tick
try dcaModule.queueDCAExecution(
actualUser,
outputToken,
context.specificSavingsToken,
saveAmount,
poolKeyForDCA,
currentTick,
0 // Default custom slippage tolerance
) {
// Mark that we've queued a swap
swapQueued = true;
emit SpecificTokenSwapQueued(
actualUser,
outputToken,
context.specificSavingsToken,
saveAmount
);
// The DCA module now has the tokens and will process savings after
swap
} catch Error(string memory reason) {
emit AfterSwapError(actualUser, reason);
} catch {
emit AfterSwapError(actualUser, "Failed to queue specific token swap");
}
}
// Only process savings if we didn't queue a swap
if (!swapQueued) {
// Process the saved tokens directly
try savingsModule.processSavings(actualUser, tokenToSave, saveAmount) {
emit OutputSavingsProcessed(actualUser, tokenToSave, saveAmount);
// Add token to processing queue for future daily savings
_addTokenToProcessingQueue(actualUser, tokenToSave);
// Handle regular DCA if enabled (separate from specific token swap)
if (context.enableDCA && context.dcaTargetToken != address(0) &&
tokenToSave != context.dcaTargetToken) {
_processDCAIfEnabled(actualUser, context, tokenToSave);
}
} catch {
} catch Error(string memory reason) {
emit AfterSwapError(actualUser, reason);
emit AfterSwapError(actualUser, "Failed to process output savings");
}
}
// Update saving strategy regardless of whether we queued a swap
savingStrategyModule.updateSavingStrategy(actualUser, context);
}
// Execute afterSwap logic with proper error handling
function _executeAfterSwapLogic(
address actualUser,
PoolKey calldata key,
IPoolManager.SwapParams calldata params,
BalanceDelta delta
) internal returns (bool) {
// Only perform work if necessary - skip for savings already processed by
_processOutputSavings
SpendSaveStorage.SwapContext memory context =
storage_.getSwapContext(actualUser);
if (!_shouldProcessSwap(actualUser) ||
((context.savingsTokenType == SpendSaveStorage.SavingsTokenType.OUTPUT ||
context.savingsTokenType == SpendSaveStorage.SavingsTokenType.SPECIFIC)
&&
context.pendingSaveAmount > 0)) {
// Clean up context and return success
storage_.deleteSwapContext(actualUser);
return true;
}
// Check modules only if needed
try this.checkModulesInitialized() {
// Process swap savings for INPUT token type
bool savingsProcessed = _trySavingsProcessing(actualUser, context, key,
delta);
// Clean up context from storage regardless of processing result
storage_.deleteSwapContext(actualUser);
// Only process daily savings if conditions are met
if (savingsProcessed && _shouldProcessDailySavings(actualUser)) {
_tryProcessDailySavings(actualUser);
}
return true;
} catch Error(string memory reason) {
emit AfterSwapError(actualUser, reason);
return false;
} catch {
emit AfterSwapError(actualUser, "Module initialization failed");
return false;
}
}
// External function to allow try/catch on module initialization
function checkModulesInitialized() external view {
_checkModulesInitialized();
}
// Try to process savings with error handling
function _trySavingsProcessing(
address actualUser,
SpendSaveStorage.SwapContext memory context,
PoolKey calldata key,
BalanceDelta delta
) internal returns (bool) {
try this.processSavingsExternal(actualUser, context, key, delta) {
return true;
} catch Error(string memory reason) {
emit AfterSwapError(actualUser, reason);
return false;
} catch {
emit AfterSwapError(actualUser, "Unknown error processing savings");
return false;
}
}
// External function to allow try/catch on savings processing
function processSavingsExternal(
address actualUser,
SpendSaveStorage.SwapContext memory context,
PoolKey calldata key,
BalanceDelta delta
) external {
if (msg.sender != address(this)) {
// Allow authorized callers with appropriate warning
if (msg.sender == storage_.owner() || msg.sender ==
storage_.spendSaveHook()) {
emit ExternalProcessingSavingsCall(msg.sender);
} else {
revert UnauthorizedAccess(msg.sender);
}
}
_processSavings(actualUser, context, key, delta);
}
}
(bool) {
// Check if we should process this swap
function _shouldProcessSwap(address actualUser) internal view returns (bool) {
return storage_.getSwapContext(actualUser).hasStrategy;
// Determine if daily savings should be processed
function _shouldProcessDailySavings(address actualUser) internal view returns
return _hasPendingDailySavings(actualUser) && gasleft() >
DAILY_SAVINGS_THRESHOLD;
}
// Efficient token processing queue management
function _addTokenToProcessingQueue(address user, address tokenAddr) internal {
if (tokenAddr == address(0)) return;
TokenProcessingQueue storage queue = _tokenProcessingQueues[user];
// If token is not in queue, add it
if (queue.tokenPositions[tokenAddr] == 0) {
queue.tokenQueue.push(tokenAddr);
queue.tokenPositions[tokenAddr] = queue.tokenQueue.length;
}
}
// Remove token from processing queue
function _removeTokenFromProcessingQueue(address user, address tokenAddr) internal
{
TokenProcessingQueue storage queue = _tokenProcessingQueues[user];
uint256 position = queue.tokenPositions[tokenAddr];
// If token is in queue
if (position > 0) {
uint256 index = position - 1;
uint256 lastIndex = queue.tokenQueue.length - 1;
// If not the last element, swap with last element
if (index != lastIndex) {
address lastToken = queue.tokenQueue[lastIndex];
queue.tokenQueue[index] = lastToken;
queue.tokenPositions[lastToken] = position;
}
// Remove last element
queue.tokenQueue.pop();
queue.tokenPositions[tokenAddr] = 0;
}
}
// Get tokens due for processing
function _getTokensDueForProcessing(address user) internal view returns (address[]
memory) {
TokenProcessingQueue storage queue = _tokenProcessingQueues[user];
address[] memory dueTokens = new address[](queue.tokenQueue.length);
uint256 count = 0;
for (uint256 i = 0; i < queue.tokenQueue.length; i++) {
address tokenAddr = queue.tokenQueue[i];
(bool canExecute, , ) = _getDailyExecutionStatus(user, tokenAddr);
if (canExecute) {
dueTokens[count] = tokenAddr;
count++;
}
}
// Resize array to actual number of due tokens
assembly {
mstore(dueTokens, count)
}
return dueTokens;
}
// Public function to process daily savings - can be called separately
function processDailySavings(address user) external nonReentrant {
_checkModulesInitialized();
require(_hasPendingDailySavings(user), "No pending savings");
// Get eligible tokens and process them
address[] memory eligibleTokens = _getTokensDueForProcessing(user);
DailySavingsProcessor memory processor = _initDailySavingsProcessor(user,
eligibleTokens);
_processDailySavingsForTokens(user, processor);
}
function _tryProcessDailySavings(address user) internal {
// Exit early if conditions aren't met
if (!_hasPendingDailySavings(user) || gasleft() < DAILY_SAVINGS_THRESHOLD)
return;
// Get eligible tokens and process them
address[] memory eligibleTokens = _getTokensDueForProcessing(user);
DailySavingsProcessor memory processor = _initDailySavingsProcessor(user,
eligibleTokens);
_processDailySavingsForTokens(user, processor);
}
function _processDailySavingsForTokens(
address user,
DailySavingsProcessor memory processor
) internal {
uint256 tokenCount = processor.tokens.length;
// Process in batches for gas efficiency
for (uint256 i = 0; i < tokenCount; i += BATCH_SIZE) {
// Stop if we're running low on gas
if (gasleft() < processor.gasLimit + processor.minGasReserve) break;
uint256 batchEnd = i + BATCH_SIZE > tokenCount ? tokenCount : i +
BATCH_SIZE;
_processBatch(user, processor, i, batchEnd);
}
if (processor.totalSaved > 0) {
emit DailySavingsExecuted(user, processor.totalSaved);
}
}
function _processBatch(
address user,
DailySavingsProcessor memory processor,
uint256 startIdx,
uint256 endIdx
) internal {
for (uint256 i = startIdx; i < endIdx; i++) {
if (gasleft() < processor.gasLimit + processor.minGasReserve) break;
address tokenAddr = processor.tokens[i];
uint256 gasStart = gasleft();
(uint256 savedAmount, bool success) = _processSingleToken(user, tokenAddr);
processor.totalSaved += savedAmount;
// If successful, update last processed timestamp and maybe remove from
queue
if (success) {
_updateTokenProcessingStatus(user, tokenAddr);
}
// Adjust gas estimate based on actual usage
uint256 gasUsed = gasStart - gasleft();
processor.gasLimit = _adjustGasLimit(processor.gasLimit, gasUsed);
}
}
function _updateTokenProcessingStatus(address user, address tokenAddr) internal {
TokenProcessingQueue storage queue = _tokenProcessingQueues[user];
queue.lastProcessed[tokenAddr] = block.timestamp;
// Check if this token is done with daily savings
(bool canExecuteAgain, , ) = _getDailyExecutionStatus(user, tokenAddr);
// If it can't be executed again (completed or no longer eligible), remove from
queue
if (!canExecuteAgain) {
_removeTokenFromProcessingQueue(user, tokenAddr);
}
}
function _adjustGasLimit(
uint256 currentLimit,
uint256 actualUsage
) internal pure returns (uint256) {
// More sophisticated algorithm that responds to both increases and decreases
if (actualUsage > currentLimit) {
// Increase gas estimate, but don't overreact
return currentLimit + ((actualUsage - currentLimit) / 4);
} else if (actualUsage < currentLimit * 8 / 10) {
// Decrease gas estimate if we used significantly less (below 80%)
return (currentLimit + actualUsage) / 2;
}
return currentLimit; // Keep same limit if usage is close to estimate
}
function _processSingleToken(address user, address tokenAddr) internal returns
(uint256 savedAmount, bool success) {
try dailySavingsModule.executeDailySavingsForToken(user, tokenAddr) returns
(uint256 amount) {
if (amount > 0) {
emit DailySavingsDetails(user, tokenAddr, amount);
return (amount, true);
}
} catch {
} catch Error(string memory reason) {
emit DailySavingsExecutionFailed(user, tokenAddr, reason);
emit DailySavingsExecutionFailed(user, tokenAddr, "Unknown error");
}
return (0, false);
}
function _initDailySavingsProcessor(
address user,
address[] memory eligibleTokens
) internal view returns (DailySavingsProcessor memory) {
return DailySavingsProcessor({
tokens: eligibleTokens,
gasLimit: INITIAL_GAS_PER_TOKEN,
totalSaved: 0,
minGasReserve: MIN_GAS_TO_KEEP
});
}
// Helper to get daily execution status
function _getDailyExecutionStatus(
address user,
address tokenAddr
) internal view returns (bool canExecute, uint256 nextExecutionTime, uint256
amountToSave) {
return dailySavingsModule.getDailyExecutionStatus(user, tokenAddr);
}
// Check if there are pending daily savings
function _hasPendingDailySavings(address user) internal view returns (bool) {
// First, check if the module is initialized
if (address(dailySavingsModule) == address(0)) return false;
return dailySavingsModule.hasPendingDailySavings(user);
}
// Helper function to get output token and amount from swap delta
function _getOutputTokenAndAmount(
PoolKey calldata key,
BalanceDelta delta
) internal virtual pure returns (address outputToken, uint256 outputAmount, bool
isToken0) {
int256 amount0 = delta.amount0();
int256 amount1 = delta.amount1();
if (amount0 > 0) {
return (Currency.unwrap(key.currency0), uint256(amount0), true);
} else if (amount1 > 0) {
return (Currency.unwrap(key.currency1), uint256(amount1), false);
}
return (address(0), 0, false);
}
// Callback function to receive tokens from the PoolManager
function lockAcquired(
bytes calldata data
) external returns (bytes memory) {
return abi.encode(poolManager.unlock.selector);
}
// Public methods to interact with token processing queue
function getUserProcessingQueueLength(address user) external view returns (uint256)
{
return _tokenProcessingQueues[user].tokenQueue.length;
}
function getUserProcessingQueueTokens(address user) external view returns
(address[] memory) {
return _tokenProcessingQueues[user].tokenQueue;
}
function getTokenLastProcessed(address user, address tokenAddr) external view
returns (uint256) {
return _tokenProcessingQueues[user].lastProcessed[tokenAddr];
}
// Token module proxy functions
function balanceOf(address owner, uint256 id) external view returns (uint256) {
return tokenModule.balanceOf(owner, id);
}
function allowance(address owner, address spender, uint256 id) external view
returns (uint256) {
return tokenModule.allowance(owner, spender, id);
}
(bool) {
function transfer(address receiver, uint256 id, uint256 amount) external returns
return tokenModule.transfer(msg.sender, receiver, id, amount);
}
function transferFrom(address sender, address receiver, uint256 id, uint256 amount)
external returns (bool) {
return tokenModule.transferFrom(msg.sender, sender, receiver, id, amount);
}
(bool) {
}
function approve(address spender, uint256 id, uint256 amount) external returns
return tokenModule.approve(msg.sender, spender, id, amount);
function safeTransfer(address receiver, uint256 id, uint256 amount, bytes calldata
data) external returns (bool) {
return tokenModule.safeTransfer(msg.sender, receiver, id, amount, data);
}
function safeTransferFrom(address sender, address receiver, uint256 id, uint256
amount, bytes calldata data) external returns (bool) {
return tokenModule.safeTransferFrom(msg.sender, sender, receiver, id, amount,
data);
}
function _setToken(address token_) internal {
if (token_ == address(0)) revert InvalidAddress();
token = token_;
}
function _setSavings(address savings_) internal {
if (savings_ == address(0)) revert InvalidAddress();
savings = savings_;
}
function _setSavingStrategy(address savingStrategy_) internal {
if (savingStrategy_ == address(0)) revert InvalidAddress();
savingStrategy = savingStrategy_;
}
function _setDcaModule(address dcaModule_) internal {
if (dcaModule_ == address(0)) revert InvalidAddress();
dcaModule = IDCAModule(dcaModule_);
}
function _setDailySavingsModule(address dailySavingsModule_) internal {
if (dailySavingsModule_ == address(0)) revert InvalidAddress();
dailySavingsModule = IDailySavingsModule(dailySavingsModule_);
}
function _setYieldModule(address yieldModule_) internal {
if (yieldModule_ == address(0)) revert InvalidAddress();
yieldModule = yieldModule_;
}
function _setSlippageControlModule(address slippageControlModule_) internal {
if (slippageControlModule_ == address(0)) revert InvalidAddress();
slippageControlModule = ISlippageControlModule(slippageControlModule_);
}
}
```
Then the spendsavestorage.sol
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IPoolManager} from
"lib/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {PoolId} from "lib/v4-periphery/lib/v4-core/src/types/PoolId.sol";
import {ReentrancyGuard} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/utils/ReentrancyGua
rd.sol";
import {PoolKey} from "lib/v4-periphery/lib/v4-core/src/types/PoolKey.sol";
import {Currency} from "lib/v4-periphery/lib/v4-core/src/types/Currency.sol";
import {IHooks} from "lib/v4-periphery/lib/v4-core/src/interfaces/IHooks.sol";
/**
*/
* @notice Centralized storage for all SpendSave modules
* @dev This contract holds all state variables used by the various modules
// Custom errors
/// @notice Thrown when a caller is not the contract owner
error NotOwner();
/// @notice Thrown when a caller is not an authorized module
error NotAuthorizedModule();
/// @notice Thrown when a caller is not the pending owner
error NotPendingOwner();
/// @notice Thrown when fee is set too high
error FeeTooHigh();
/// @notice Thrown when savings balance is insufficient
error InsufficientSavings();
/// @notice Thrown when array index is out of bounds
error IndexOutOfBounds();
/// @notice Thrown when token balance is insufficient
error InsufficientBalance();
/**
* @title SpendSaveStorage
* @author Your Name
* @notice Central storage contract for the SpendSave protocol
* @dev This contract acts as a shared database for all SpendSave modules,
* maintaining all state and providing controlled access to different modules
*/
contract SpendSaveStorage is ReentrancyGuard {
// Owner and access control
address public owner;
address public pendingOwner;
address public treasury;
// Module registry
address public savingStrategyModule;
address public savingsModule;
address public dcaModule;
address public slippageControlModule;
address public tokenModule;
address public yieldModule;
address public dailySavingsModule;
// Main hook reference
address public spendSaveHook;
IPoolManager public poolManager;
// Enums
enum SavingsTokenType { OUTPUT, INPUT, SPECIFIC }
enum YieldStrategy { NONE, AAVE, COMPOUND, UNISWAP_LP }
enum SlippageAction { CONTINUE, REVERT }
// Treasury configuration
uint256 public treasuryFee; // Basis points (0.01%)
/**
* @notice User's saving strategy configuration
* @dev Defines how tokens are saved during swaps
* @param percentage Base percentage to save (0-10000, where 10000 = 100%)
* @param autoIncrement Percentage to increase after each swap
* @param maxPercentage Maximum percentage cap for auto-increments
* @param goalAmount Target savings goal for each token
* @param roundUpSavings Whether to round up to nearest whole token unit
* @param enableDCA Whether dollar-cost averaging is enabled
* @param savingsTokenType Which token to save (INPUT, OUTPUT, or SPECIFIC)
* @param specificSavingsToken Address of specific token to save, if applicable
*/
struct SavingStrategy {
uint256 percentage; // Base percentage to save (0-100%)
uint256 autoIncrement; // Optional auto-increment percentage per swap
uint256 maxPercentage; // Maximum percentage cap
uint256 goalAmount; // Savings goal for each token
bool roundUpSavings; // Round up to nearest whole token unit
bool enableDCA; // Enable dollar-cost averaging into target token
SavingsTokenType savingsTokenType; // Which token to save
address specificSavingsToken; // Specific token to save, if that option is
selected
}
// User savings data
struct SavingsData {
uint256 totalSaved; uint256 lastSaveTime; uint256 swapCount; // Total amount saved
// Last time user saved
// Number of swaps with savings
uint256 targetSellPrice; // Target price to auto-sell savings
}
// Swap context for passing data between beforeSwap and afterSwap
struct SwapContext {
bool hasStrategy;
uint256 currentPercentage;
bool roundUpSavings;
bool enableDCA;
address dcaTargetToken;
int24 currentTick; // Current tick at swap time
SavingsTokenType savingsTokenType;
address specificSavingsToken;
address inputToken; // Track input token for INPUT savings type
uint256 inputAmount; // Track input amount for INPUT savings type
uint256 pendingSaveAmount; // Add this field
}
// DCA execution details
struct DCAExecution {
address fromToken;
address toToken;
uint256 amount;
int24 executionTick; uint256 deadline; bool executed;
uint256 customSlippageTolerance;
// Tick at which DCA should execute
// Deadline for execution
}
// DCA tick strategies
struct DCATickStrategy {
int24 tickDelta; // +/- ticks from current for better execution
uint256 tickExpiryTime; // How long to wait before executing regardless of
tick
bool onlyImprovePrice; // If true, only execute when price is better than
entry
int24 minTickImprovement; // Minimum tick improvement required
bool dynamicSizing; // If true, calculate amount based on tick movement
uint256 customSlippageTolerance;
}
// Daily savings configuration
struct DailySavingsConfig {
bool enabled;
uint256 lastExecutionTime;
uint256 startTime;
uint256 goalAmount;
uint256 currentAmount;
uint256 penaltyBps; // Basis points for early withdrawal penalty (e.g., 500 =
5%)
uint256 endTime; // Target date to reach goal (0 means no end date)
}
struct DailySavingsConfigParams {
bool enabled;
uint256 goalAmount;
uint256 currentAmount;
uint256 penaltyBps;
uint256 endTime;
}
// Mappings - Strategy module
mapping(address => SavingStrategy) internal _userSavingStrategies;
// Mappings - Savings module
mapping(address => mapping(address => uint256)) internal _savings;
mapping(address => mapping(address => SavingsData)) internal _savingsData;
mapping(address => uint256) internal _withdrawalTimelock;
// Mappings - DCA module
mapping(address => address) internal _dcaTargetToken;
mapping(address => DCATickStrategy) internal _dcaTickStrategies;
mapping(address => DCAExecution[]) internal _dcaQueue;
mapping(PoolId => int24) internal _poolTicks;
// Mappings - Swap context
mapping(address => SwapContext) internal _swapContexts;
// Mappings - Yield module
mapping(address => mapping(address => YieldStrategy)) internal _yieldStrategies;
// Mappings - Slippage module
mapping(address => uint256) internal _userSlippageTolerance;
mapping(address => mapping(address => uint256)) internal _tokenSlippageTolerance;
mapping(address => SlippageAction) internal _slippageExceededAction;
uint256 public defaultSlippageTolerance;
// Mappings - Token module (ERC6909)
mapping(address => mapping(uint256 => uint256)) internal _balances;
mapping(address => mapping(address => mapping(uint256 => uint256))) internal
_allowances;
mapping(address => uint256) internal _tokenToId;
mapping(uint256 => address) internal _idToToken;
uint256 internal _nextTokenId;
// Track daily savings for each user and token
mapping(address => mapping(address => DailySavingsConfig)) internal
_dailySavingsConfig;
mapping(address => mapping(address => uint256)) internal _dailySavingsAmount;
mapping(address => address[]) internal _userSavingsTokens; // Track which tokens a
user is saving
// Track daily savings for each user and token// Yield strategy for daily savings
mapping(address => mapping(address => YieldStrategy)) internal
_dailySavingsYieldStrategy;
uint256 private constant MAX_TREASURY_FEE = 100; // 1%
uint256 private constant DEFAULT_TREASURY_FEE = 80; // 0.8%
uint256 private constant DEFAULT_SLIPPAGE_TOLERANCE = 100; // 1%
uint256 private constant FIRST_TOKEN_ID = 1;
/**
* @notice Contract constructor
* @param _owner Address of the contract owner
* @param _treasury Address of the treasury to collect fees
* @param _poolManager Address of the Uniswap V4 pool manager
*/
constructor(address _owner, address _treasury, IPoolManager _poolManager) {
owner = _owner;
treasury = _treasury;
poolManager = _poolManager;
treasuryFee = DEFAULT_TREASURY_FEE;
defaultSlippageTolerance = DEFAULT_SLIPPAGE_TOLERANCE;
_nextTokenId = FIRST_TOKEN_ID;
}
/**
* @notice Access control modifier
* @dev Only allows the contract owner to call functions
*/
modifier onlyOwner() {
if (msg.sender != owner) revert NotOwner();
_;
}
/**
* @notice Access control modifier
* @dev Only allows authorized modules to call functions
*/
function _isAuthorizedModule(
address caller
) internal view returns (bool) {
return (
caller == savingStrategyModule ||
caller == savingsModule ||
caller == dcaModule ||
caller == slippageControlModule ||
caller == tokenModule ||
caller == yieldModule ||
caller == dailySavingsModule ||
caller == spendSaveHook
);
}
modifier onlyModule() {
if (!_isAuthorizedModule(msg.sender)) {
revert NotAuthorizedModule();
}
_;
}
/**
* @notice Sets the SpendSave hook contract address
* @param _hook Address of the SpendSave hook contract
* @dev Only callable by the contract owner
*/
function setSpendSaveHook(address _hook) external onlyOwner {
spendSaveHook = _hook;
}
/**
* @notice Sets the SavingStrategy module address
* @param _module Address of the SavingStrategy module
* @dev Only callable by the contract owner
*/
function setSavingStrategyModule(address _module) external onlyOwner {
savingStrategyModule = _module;
}
/**
* @notice Sets the Savings module address
* @param _module Address of the Savings module
* @dev Only callable by the contract owner
*/
function setSavingsModule(address _module) external onlyOwner {
savingsModule = _module;
}
/**
* @notice Sets the DCA module address
* @param _module Address of the DCA module
* @dev Only callable by the contract owner
*/
function setDCAModule(address _module) external onlyOwner {
dcaModule = _module;
}
/**
* @notice Sets the SlippageControl module address
* @param _module Address of the SlippageControl module
* @dev Only callable by the contract owner
*/
function setSlippageControlModule(address _module) external onlyOwner {
slippageControlModule = _module;
}
/**
* @notice Sets the Token module address
* @param _module Address of the Token module
* @dev Only callable by the contract owner
*/
function setTokenModule(address _module) external onlyOwner {
tokenModule = _module;
}
function setYieldModule(address _module) external onlyOwner {
yieldModule = _module;
}
function setDailySavingsModule(address _module) external onlyOwner {
dailySavingsModule = _module;
}
// Ownership transfer functions
function transferOwnership(address _newOwner) external onlyOwner {
pendingOwner = _newOwner;
}
function acceptOwnership() external {
if (msg.sender != pendingOwner) revert NotPendingOwner();
owner = pendingOwner;
pendingOwner = address(0);
}
// Treasury management
function setTreasury(address _treasury) external onlyOwner {
treasury = _treasury;
}
function setTreasuryFee(uint256 _fee) external onlyOwner {
if (_fee > 500) revert FeeTooHigh(); // Max 5%
treasuryFee = _fee;
}
/**
* @notice Calculates and transfers the fee to the treasury
* @param user Address of the user
* @param token Address of the token
* @param amount Amount of tokens to calculate fee for
* @return Amount after fee deduction
*/
function calculateAndTransferFee(address user, address token, uint256 amount)
external onlyModule returns (uint256) {
return _calculateAndTransferFee(user, token, amount);
}
function _calculateAndTransferFee(address user, address token, uint256 amount)
internal returns (uint256) {
uint256 fee = (amount * treasuryFee) / 10000;
if (fee > 0) {
_savings[treasury][token] += fee;
return amount - fee;
}
return amount;
}
function getUserSavingStrategy(address user) external view returns (
uint256 percentage,
uint256 autoIncrement,
uint256 maxPercentage,
uint256 goalAmount,
bool roundUpSavings,
bool enableDCA,
SavingsTokenType savingsTokenType,
address specificSavingsToken
) {
SavingStrategy storage strategy = _userSavingStrategies[user];
return (
strategy.percentage,
strategy.autoIncrement,
strategy.maxPercentage,
strategy.goalAmount,
strategy.roundUpSavings,
strategy.enableDCA,
strategy.savingsTokenType,
strategy.specificSavingsToken
);
}
/**
* @notice Sets the user's saving strategy
* @param user Address of the user
* @param percentage Base percentage to save (0-100%)
* @param autoIncrement Percentage to increase after each swap
* @param maxPercentage Maximum percentage cap for auto-increments
* @param goalAmount Target savings goal for each token
*/
function setUserSavingStrategy(
address user,
uint256 percentage,
uint256 autoIncrement,
uint256 maxPercentage,
uint256 goalAmount,
bool roundUpSavings,
bool enableDCA,
SavingsTokenType savingsTokenType,
address specificSavingsToken
) external onlyModule {
SavingStrategy storage strategy = _userSavingStrategies[user];
strategy.percentage = percentage;
strategy.autoIncrement = autoIncrement;
strategy.maxPercentage = maxPercentage;
strategy.goalAmount = goalAmount;
strategy.roundUpSavings = roundUpSavings;
strategy.enableDCA = enableDCA;
strategy.savingsTokenType = savingsTokenType;
strategy.specificSavingsToken = specificSavingsToken;
}
/**
* @notice Getter for savings
* @param user Address of the user
* @param token Address of the token
* @return Amount of savings
*/
function savings(address user, address token) external view returns (uint256) {
return _savings[user][token];
}
/**
* @notice Sets the savings
* @param user Address of the user
* @param token Address of the token
* @param amount Amount of savings to set
*/
onlyModule {
function setSavings(address user, address token, uint256 amount) external
_savings[user][token] = amount;
}
function increaseSavings(address user, address token, uint256 amount) external
onlyModule {
_savings[user][token] += amount;
}
function decreaseSavings(address user, address token, uint256 amount) external
onlyModule {
if (_savings[user][token] < amount) revert InsufficientSavings();
_savings[user][token] -= amount;
}
// Getters and setters for savings data
function getSavingsData(address user, address token) external view returns (
uint256 totalSaved,
uint256 lastSaveTime,
uint256 swapCount,
uint256 targetSellPrice
) {
SavingsData storage data = _savingsData[user][token];
return (
data.totalSaved,
data.lastSaveTime,
data.swapCount,
data.targetSellPrice
);
}
/**
* @notice Sets the savings data
* @param user Address of the user
* @param token Address of the token
* @param totalSaved Amount of savings
* @param lastSaveTime Last save time
* @param swapCount Number of swaps
* @param targetSellPrice Target sell price
*/
function setSavingsData(
address user,
address token,
uint256 totalSaved,
uint256 lastSaveTime,
uint256 swapCount,
uint256 targetSellPrice
) external onlyModule {
SavingsData storage data = _savingsData[user][token];
data.totalSaved = totalSaved;
data.lastSaveTime = lastSaveTime;
data.swapCount = swapCount;
data.targetSellPrice = targetSellPrice;
}
/**
* @notice Updates the savings data
* @param user Address of the user
* @param token Address of the token
* @param additionalSaved Amount of additional savings
*/
function updateSavingsData(
address user,
address token,
uint256 additionalSaved
) external onlyModule {
SavingsData storage data = _savingsData[user][token];
data.totalSaved += additionalSaved;
data.lastSaveTime = block.timestamp;
data.swapCount++;
}
// Daily savings configuration
function getDailySavingsConfig(address user, address token) external view returns (
bool enabled,
uint256 lastExecutionTime,
uint256 startTime,
uint256 goalAmount,
uint256 currentAmount,
uint256 penaltyBps,
uint256 endTime
) {
DailySavingsConfig storage config = _dailySavingsConfig[user][token];
return (
config.enabled,
config.lastExecutionTime,
config.startTime,
config.goalAmount,
config.currentAmount,
config.penaltyBps,
config.endTime
);
}
function setDailySavingsConfig(
address user,
address token,
DailySavingsConfigParams calldata params
) external onlyModule {
DailySavingsConfig storage config = _dailySavingsConfig[user][token];
// Initialize if first time
if (!config.enabled && params.enabled) {
_initializeDailySavings(user, token);
}
// Update the configuration
_updateDailySavingsConfig(config, params);
}
// Helper functions
function _initializeDailySavings(address user, address token) internal {
DailySavingsConfig storage config = _dailySavingsConfig[user][token];
config.startTime = block.timestamp;
config.lastExecutionTime = block.timestamp;
_addTokenIfNotExists(user, token);
}
function _updateDailySavingsConfig(DailySavingsConfig storage config,
DailySavingsConfigParams calldata params) internal {
config.enabled = params.enabled;
config.goalAmount = params.goalAmount;
config.currentAmount = params.currentAmount;
config.penaltyBps = params.penaltyBps;
config.endTime = params.endTime;
}
function _addTokenIfNotExists(address user, address token) internal {
bool tokenExists = false;
address[] storage userTokens = _userSavingsTokens[user];
for (uint i = 0; i < userTokens.length; i++) {
if (userTokens[i] == token) {
tokenExists = true;
break;
}
}
if (!tokenExists) {
userTokens.push(token);
}
}
function getDailySavingsAmount(address user, address token) external view returns
(uint256) {
return _dailySavingsAmount[user][token];
}
function setDailySavingsAmount(address user, address token, uint256 amount)
external onlyModule {
_dailySavingsAmount[user][token] = amount;
}
function getUserSavingsTokens(address user) external view returns (address[]
memory) {
return _userSavingsTokens[user];
}
function updateDailySavingsExecution(address user, address token, uint256 amount)
external onlyModule {
DailySavingsConfig storage config = _dailySavingsConfig[user][token];
config.lastExecutionTime = block.timestamp;
config.currentAmount += amount;
}
function getDailySavingsYieldStrategy(address user, address token) external view
returns (YieldStrategy) {
return _dailySavingsYieldStrategy[user][token];
}
function setDailySavingsYieldStrategy(address user, address token, YieldStrategy
strategy) external onlyModule {
_dailySavingsYieldStrategy[user][token] = strategy;
}
// Withdrawal timelock
function withdrawalTimelock(address user) external view returns (uint256) {
return _withdrawalTimelock[user];
}
function setWithdrawalTimelock(address user, uint256 timelock) external onlyModule
{
_withdrawalTimelock[user] = timelock;
}
// DCA target token
function dcaTargetToken(address user) external view returns (address) {
return _dcaTargetToken[user];
}
function setDcaTargetToken(address user, address token) external onlyModule {
_dcaTargetToken[user] = token;
}
// DCA tick strategies
function getDcaTickStrategy(address user) external view returns (
int24 tickDelta,
uint256 tickExpiryTime,
bool onlyImprovePrice,
int24 minTickImprovement,
bool dynamicSizing,
uint256 customSlippageTolerance
) {
DCATickStrategy storage strategy = _dcaTickStrategies[user];
return (
strategy.tickDelta,
strategy.tickExpiryTime,
strategy.onlyImprovePrice,
strategy.minTickImprovement,
strategy.dynamicSizing,
strategy.customSlippageTolerance
);
}
function setDcaTickStrategy(
address user,
int24 tickDelta,
uint256 tickExpiryTime,
bool onlyImprovePrice,
int24 minTickImprovement,
bool dynamicSizing,
uint256 customSlippageTolerance
) external onlyModule {
DCATickStrategy storage strategy = _dcaTickStrategies[user];
strategy.tickDelta = tickDelta;
strategy.tickExpiryTime = tickExpiryTime;
strategy.onlyImprovePrice = onlyImprovePrice;
strategy.minTickImprovement = minTickImprovement;
strategy.dynamicSizing = dynamicSizing;
strategy.customSlippageTolerance = customSlippageTolerance;
}
// DCA queue operations
function getDcaQueueLength(address user) external view returns (uint256) {
return _dcaQueue[user].length;
}
function getDcaQueueItem(address user, uint256 index) external view returns (
address fromToken,
address toToken,
uint256 amount,
int24 executionTick,
uint256 deadline,
bool executed,
uint256 customSlippageTolerance
) {
if (index >= _dcaQueue[user].length) revert IndexOutOfBounds();
DCAExecution storage execution = _dcaQueue[user][index];
return (
execution.fromToken,
execution.toToken,
execution.amount,
execution.executionTick,
execution.deadline,
execution.executed,
execution.customSlippageTolerance
);
}
function addToDcaQueue(
address user,
address fromToken,
address toToken,
uint256 amount,
int24 executionTick,
uint256 deadline,
uint256 customSlippageTolerance
) external onlyModule {
_dcaQueue[user].push(DCAExecution({
fromToken: fromToken,
toToken: toToken,
amount: amount,
executionTick: executionTick,
deadline: deadline,
executed: false,
customSlippageTolerance: customSlippageTolerance
}));
}
function markDcaExecuted(address user, uint256 index) external onlyModule {
if (index >= _dcaQueue[user].length) revert IndexOutOfBounds();
_dcaQueue[user][index].executed = true;
}
// Pool ticks
function poolTicks(PoolId poolId) external view returns (int24) {
return _poolTicks[poolId];
}
/**
* @notice Creates a pool key with custom parameters
* @param tokenA First token address
* @param tokenB Second token address
* @param feeTier Fee tier (e.g., 3000 for 0.3%)
* @param tickSpacing Tick spacing for the pool
* @return Pool key for the specified parameters
*/
function createPoolKey(
address tokenA,
address tokenB,
uint24 feeTier,
int24 tickSpacing
) public pure returns (PoolKey memory) {
// Ensure tokens are in correct order
(address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) :
(tokenB, tokenA);
return PoolKey({
currency0: Currency.wrap(token0),
currency1: Currency.wrap(token1),
fee: feeTier,
tickSpacing: tickSpacing,
hooks: IHooks(address(0)) // No hooks for this swap to avoid recursive
calls
});
}
function createPoolKey(address tokenA, address tokenB) public pure returns (PoolKey
memory) {
return createPoolKey(tokenA, tokenB, 3000, 60); // Default 0.3% fee tier and 60
tick spacing
}
function setPoolTick(PoolId poolId, int24 tick) external onlyModule {
_poolTicks[poolId] = tick;
}
// SwapContext accessors
function getSwapContext(address user) external view onlyModule returns (SwapContext
memory) {
return _swapContexts[user];
}
function setSwapContext(address user, SwapContext memory context) external
_swapContexts[user] = context;
onlyModule {
}
function deleteSwapContext(address user) external onlyModule {
delete _swapContexts[user];
}
// Yield strategies
function getYieldStrategy(address user, address token) external view returns
(YieldStrategy) {
return _yieldStrategies[user][token];
}
function setYieldStrategy(address user, address token, YieldStrategy strategy)
external onlyModule {
_yieldStrategies[user][token] = strategy;
}
// Slippage settings
function userSlippageTolerance(address user) external view returns (uint256) {
return _userSlippageTolerance[user];
}
function setUserSlippageTolerance(address user, uint256 tolerance) external
_userSlippageTolerance[user] = tolerance;
onlyModule {
}
function tokenSlippageTolerance(address user, address token) external view returns
(uint256) {
return _tokenSlippageTolerance[user][token];
}
function setTokenSlippageTolerance(address user, address token, uint256 tolerance)
external onlyModule {
_tokenSlippageTolerance[user][token] = tolerance;
}
function slippageExceededAction(address user) external view returns
(SlippageAction) {
return _slippageExceededAction[user];
}
function setSlippageExceededAction(address user, SlippageAction action) external
_slippageExceededAction[user] = action;
onlyModule {
}
function setDefaultSlippageTolerance(uint256 tolerance) external onlyModule {
defaultSlippageTolerance = tolerance;
}
// ERC6909 storage accessors
function getBalance(address user, uint256 id) external view onlyModule returns
(uint256) {
return _balances[user][id];
}
function setBalance(address user, uint256 id, uint256 amount) external onlyModule {
_balances[user][id] = amount;
}
function increaseBalance(address user, uint256 id, uint256 amount) external
onlyModule {
_balances[user][id] += amount;
}
function decreaseBalance(address user, uint256 id, uint256 amount) external
onlyModule {
if (_balances[user][id] < amount) revert InsufficientBalance();
_balances[user][id] -= amount;
}
function getAllowance(address tokenOwner, address spender, uint256 id) external
view onlyModule returns (uint256) {
return _allowances[tokenOwner][spender][id];
}
function setAllowance(address tokenOwner, address spender, uint256 id, uint256
amount) external onlyModule {
_allowances[tokenOwner][spender][id] = amount;
}
function tokenToId(address token) external view returns (uint256) {
return _tokenToId[token];
}
function setTokenToId(address token, uint256 id) external onlyModule {
_tokenToId[token] = id;
}
function idToToken(uint256 id) external view returns (address) {
return _idToToken[id];
}
function setIdToToken(uint256 id, address token) external onlyModule {
_idToToken[id] = token;
}
function getNextTokenId() external view onlyModule returns (uint256) {
return _nextTokenId;
}
function incrementNextTokenId() external onlyModule returns (uint256) {
return _nextTokenId++;
}
}
```
Then the savingstrategy.sol
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {PoolKey} from "lib/v4-periphery/lib/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from
"lib/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {Currency} from "lib/v4-periphery/lib/v4-core/src/types/Currency.sol";
import {IERC20} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.
sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {StateLibrary} from
"lib/v4-periphery/lib/v4-core/src/libraries/StateLibrary.sol";
import {PoolId, PoolIdLibrary} from
"lib/v4-periphery/lib/v4-core/src/types/PoolId.sol";
import {ReentrancyGuard} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/utils/ReentrancyGua
rd.sol";
import {
BeforeSwapDelta,
toBeforeSwapDelta
} from "lib/v4-periphery/lib/v4-core/src/types/BeforeSwapDelta.sol";
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";
import {Currency} from "v4-core/types/Currency.sol";
import "./SpendSaveStorage.sol";
import "./ISavingStrategyModule.sol";
import "./ISavingsModule.sol";
/**j
* @title SavingStrategy
* @dev Handles user saving strategies and swap preparation
*/
contract SavingStrategy is ISavingStrategyModule, ReentrancyGuard {
using SafeERC20 for IERC20;
using PoolIdLibrary for PoolKey;
using CurrencySettler for Currency;
// Cached constants to reduce gas costs
uint256 private constant PERCENTAGE_DENOMINATOR = 10000;
uint256 private constant MAX_PERCENTAGE = 10000; // 100%
uint256 private constant TOKEN_UNIT = 1e18; // Assuming 18 decimals
struct SavingStrategyParams {
uint256 percentage;
uint256 autoIncrement;
uint256 maxPercentage;
bool roundUpSavings;
SpendSaveStorage.SavingsTokenType savingsTokenType;
address specificSavingsToken;
}
struct SwapContextBuilder {
SpendSaveStorage.SwapContext context;
SpendSaveStorage.SavingStrategy strategy;
}
struct SavingsCalculation {
uint256 saveAmount;
uint256 reducedSwapAmount;
}
// Storage reference
SpendSaveStorage public storage_;
// Module references
ISavingsModule public savingsModule;
// Events
event SavingStrategySet(address indexed user, uint256 percentage, uint256
autoIncrement, uint256 maxPercentage, SpendSaveStorage.SavingsTokenType tokenType);
event GoalSet(address indexed user, address indexed token, uint256 amount);
event SwapPrepared(address indexed user, uint256 currentSavePercentage,
SpendSaveStorage.SavingsTokenType tokenType);
event SpecificSavingsTokenSet(address indexed user, address indexed token);
event TransferFailure(address indexed user, address indexed token, uint256 amount,
bytes reason);
event InputTokenSaved(address indexed user, address indexed token, uint256
savedAmount, uint256 remainingSwapAmount);
event ModuleInitialized(address indexed storage_);
event ModuleReferencesSet(address indexed savingsModule);
event SavingStrategyUpdated(address indexed user, uint256 newPercentage);
event TreasuryFeeCollected(address indexed user, address indexed token, uint256
fee);
event FailedToApplySavings(address user, string reason);
// Define event declarations
event ProcessingInputTokenSavings(address indexed actualUser, address indexed
token, uint256 amount);
event InputTokenSavingsSkipped(address indexed actualUser, string reason);
event SavingsCalculated(address indexed actualUser, uint256 saveAmount, uint256
reducedSwapAmount);
event UserBalanceChecked(address indexed actualUser, address indexed token, uint256
balance);
event InsufficientBalance(address indexed actualUser, address indexed token,
uint256 required, uint256 available);
event AllowanceChecked(address indexed actualUser, address indexed token, uint256
allowance);
event InsufficientAllowance(address indexed actualUser, address indexed token,
uint256 required, uint256 available);
event SavingsTransferStatus(address indexed actualUser, address indexed token, bool
success);
event SavingsTransferInitiated(address indexed actualUser, address indexed token,
uint256 amount);
event SavingsTransferSuccess(address indexed actualUser, address indexed token,
uint256 amount, uint256 contractBalance);
event SavingsTransferFailure(address indexed actualUser, address indexed token,
uint256 amount, bytes reason);
event NetAmountAfterFee(address indexed actualUser, address indexed token, uint256
netAmount);
event UserSavingsUpdated(address indexed actualUser, address indexed token, uint256
newSavings);
// Define event declarations
event FeeApplied(address indexed actualUser, address indexed token, uint256
feeAmount);
event SavingsProcessingFailed(address indexed actualUser, address indexed token,
bytes reason);
event SavingsProcessedSuccessfully(address indexed actualUser, address indexed
token, uint256 amount);
event ProcessInputSavingsAfterSwapCalled(
address indexed actualUser,
address indexed inputToken,
uint256 pendingSaveAmount
);
// Custom errors
error PercentageTooHigh(uint256 provided, uint256 max);
error MaxPercentageTooLow(uint256 maxPercentage, uint256 percentage);
error InvalidSpecificToken();
error SavingsTooHigh(uint256 saveAmount, uint256 inputAmount);
error AlreadyInitialized();
error OnlyUserOrHook();
error OnlyHook();
error OnlyOwner();
error UnauthorizedCaller();
error ModuleNotInitialized(string moduleName);
// Constructor is empty since module will be initialized via initialize()
constructor() {}
modifier onlyAuthorized(address user) {
if (msg.sender != user &&
msg.sender != address(storage_) &&
msg.sender != storage_.spendSaveHook()) {
revert UnauthorizedCaller();
}
_;
}
// Initialize module with storage reference
function initialize(SpendSaveStorage _storage) external override nonReentrant {
if(address(storage_) != address(0)) revert AlreadyInitialized();
storage_ = _storage;
emit ModuleInitialized(address(_storage));
}
// Set references to other modules
function setModuleReferences(address _savingsModule) external nonReentrant {
if(msg.sender != storage_.owner()) revert OnlyOwner();
savingsModule = ISavingsModule(_savingsModule);
emit ModuleReferencesSet(_savingsModule);
}
// Public function to set a user's saving strategy
function setSavingStrategy(
address user,
uint256 percentage,
uint256 autoIncrement,
uint256 maxPercentage,
bool roundUpSavings,
SpendSaveStorage.SavingsTokenType savingsTokenType,
address specificSavingsToken
) external override onlyAuthorized(user) nonReentrant {
// Validation
if (percentage > MAX_PERCENTAGE) revert PercentageTooHigh({provided:
percentage, max: MAX_PERCENTAGE});
if (maxPercentage > MAX_PERCENTAGE) revert PercentageTooHigh({provided:
maxPercentage, max: MAX_PERCENTAGE});
if (maxPercentage < percentage) revert MaxPercentageTooLow({maxPercentage:
maxPercentage, percentage: percentage});
if (savingsTokenType == SpendSaveStorage.SavingsTokenType.SPECIFIC) {
if (specificSavingsToken == address(0)) revert InvalidSpecificToken();
}
// Get current strategy
SpendSaveStorage.SavingStrategy memory strategy = _getUserSavingStrategy(user);
// Update strategy values
strategy.percentage = percentage;
strategy.autoIncrement = autoIncrement;
strategy.maxPercentage = maxPercentage;
strategy.roundUpSavings = roundUpSavings;
strategy.savingsTokenType = savingsTokenType;
strategy.specificSavingsToken = specificSavingsToken;
// Update the strategy in storage
_saveUserStrategy(user, strategy);
if (savingsTokenType == SpendSaveStorage.SavingsTokenType.SPECIFIC) {
emit SpecificSavingsTokenSet(user, specificSavingsToken);
}
emit SavingStrategySet(user, percentage, autoIncrement, maxPercentage,
savingsTokenType);
}
function _saveUserStrategy(
address user,
SpendSaveStorage.SavingStrategy memory strategy
) internal {
storage_.setUserSavingStrategy(
user,
strategy.percentage,
strategy.autoIncrement,
strategy.maxPercentage,
strategy.goalAmount,
strategy.roundUpSavings,
strategy.enableDCA,
strategy.savingsTokenType,
strategy.specificSavingsToken
);
}
// Set savings goal for a token
function setSavingsGoal(address user, address token, uint256 amount) external
override onlyAuthorized(user) nonReentrant {
// Get current strategy
SpendSaveStorage.SavingStrategy memory strategy = _getUserSavingStrategy(user);
// Update goal amount
strategy.goalAmount = amount;
// Update strategy in storage
_saveUserStrategy(user, strategy);
emit GoalSet(user, token, amount);
}
/**
* @notice Prepares savings calculations and adjustments before a swap occurs
* @dev This function is called by the SpendSaveHook before executing a Uniswap V4
swap
* @param actualUser The address of the user performing the swap
* @param key The Uniswap V4 pool key containing token and fee information
* @param params The Uniswap V4 swap parameters containing amounts and direction
* @return BeforeSwapDelta The delta adjustments to apply to the swap amounts
* @custom:security nonReentrant Only callable by storage contract or hook
*/
function beforeSwap(
address actualUser,
PoolKey calldata key,
IPoolManager.SwapParams calldata params
) external virtual override nonReentrant returns (BeforeSwapDelta) {
// Verify caller is authorized
if (msg.sender != address(storage_) && msg.sender != storage_.spendSaveHook())
revert OnlyHook();
// Check that required modules are initialized
if (address(savingsModule) == address(0)) revert
ModuleNotInitialized("SavingsModule");
// Get user's saving strategy configuration
SpendSaveStorage.SavingStrategy memory strategy =
_getUserSavingStrategy(actualUser);
// If user has no savings percentage set, create empty context and return no
adjustments
if (strategy.percentage == 0) {
SpendSaveStorage.SwapContext memory emptyContext;
emptyContext.hasStrategy = false;
storage_.setSwapContext(actualUser, emptyContext);
return toBeforeSwapDelta(0, 0);
}
// Build context containing swap and strategy information
SpendSaveStorage.SwapContext memory context = _buildSwapContext(actualUser,
strategy, key, params);
// Initialize delta adjustments
int128 specifiedDelta = 0;
int128 unspecifiedDelta = 0;
// Only process savings if user wants to save input tokens
if (context.savingsTokenType == SpendSaveStorage.SavingsTokenType.INPUT) {
// Calculate how much to save and adjust swap amount
SavingsCalculation memory calc = _calculateInputSavings(context);
if (calc.saveAmount > 0) {
// Store savings amount to process after swap
context.pendingSaveAmount = calc.saveAmount;
// Adjust swap amounts based on direction and exact input/output
// Positive deltas reduce the swap amount to account for savings
if (params.zeroForOne) {
if (params.amountSpecified < 0) {
// For exact input swaps token0 -> token1, reduce specified
amount
specifiedDelta = int128(int256(calc.saveAmount));
} else {
// For exact output swaps token0 -> token1, reduce unspecified
amount
unspecifiedDelta = int128(int256(calc.saveAmount));
}
} else {
if (params.amountSpecified < 0) {
// For exact input swaps token1 -> token0, reduce specified
amount
specifiedDelta = int128(int256(calc.saveAmount));
} else {
// For exact output swaps token1 -> token0, reduce unspecified
amount
unspecifiedDelta = int128(int256(calc.saveAmount));
}
}
}
}
// Store context for use in afterSwap
storage_.setSwapContext(actualUser, context);
emit SwapPrepared(actualUser, context.currentPercentage,
strategy.savingsTokenType);
// Return calculated adjustments
return toBeforeSwapDelta(specifiedDelta, unspecifiedDelta);
}
// New helper function to build swap context
function _buildSwapContext(
address user,
SpendSaveStorage.SavingStrategy memory strategy,
PoolKey calldata key,
IPoolManager.SwapParams calldata params
) internal view virtual returns (SpendSaveStorage.SwapContext memory context) {
context.hasStrategy = true;
// Calculate current percentage with auto-increment if applicable
context.currentPercentage = _calculateCurrentPercentage(
strategy.percentage,
strategy.autoIncrement,
strategy.maxPercentage
);
// Get current tick from pool
context.currentTick = _getCurrentTick(key);
// Copy properties from strategy to context
context.roundUpSavings = strategy.roundUpSavings;
context.enableDCA = strategy.enableDCA;
context.dcaTargetToken = storage_.dcaTargetToken(user);
context.savingsTokenType = strategy.savingsTokenType;
context.specificSavingsToken = strategy.specificSavingsToken;
// For INPUT token savings type, extract input token and amount
if (strategy.savingsTokenType == SpendSaveStorage.SavingsTokenType.INPUT) {
(context.inputToken, context.inputAmount) =
_extractInputTokenAndAmount(key, params);
}
return context;
}
// Helper function to get user saving strategy
function _getUserSavingStrategy(address user) internal view returns
(SpendSaveStorage.SavingStrategy memory strategy) {
(
strategy.percentage,
strategy.autoIncrement,
strategy.maxPercentage,
strategy.goalAmount,
strategy.roundUpSavings,
strategy.enableDCA,
strategy.savingsTokenType,
strategy.specificSavingsToken
) = storage_.getUserSavingStrategy(user);
return strategy;
}
// Helper to calculate the current saving percentage with auto-increment
function _calculateCurrentPercentage(
uint256 basePercentage,
uint256 autoIncrement,
uint256 maxPercentage
) internal pure returns (uint256) {
if (autoIncrement == 0 || basePercentage >= maxPercentage) {
return basePercentage;
}
uint256 newPercentage = basePercentage + autoIncrement;
return newPercentage > maxPercentage ? maxPercentage : newPercentage;
}
// Helper to extract input token and amount from swap params
function _extractInputTokenAndAmount(
PoolKey calldata key,
IPoolManager.SwapParams calldata params
) internal pure virtual returns (address token, uint256 amount) {
token = params.zeroForOne ? Currency.unwrap(key.currency0) :
Currency.unwrap(key.currency1);
amount = uint256(params.amountSpecified > 0 ? params.amountSpecified :
-params.amountSpecified);
return (token, amount);
}
// Helper to process input token savings
// Process the actual input token savings - only executes the transfer and
processing
function _processInputTokenSavings(
address actualUser,
SpendSaveStorage.SwapContext memory context
) internal returns (bool) {
// Skip if no input amount
if (context.inputAmount == 0) {
emit InputTokenSavingsSkipped(actualUser, "Input amount is 0");
return false;
}
// Calculate savings amount
SavingsCalculation memory calc = _calculateInputSavings(context);
// Skip if nothing to save
if (calc.saveAmount == 0) {
emit InputTokenSavingsSkipped(actualUser, "Save amount is 0");
return false;
}
// Check user balance before transfer
try IERC20(context.inputToken).balanceOf(actualUser) returns (uint256 balance)
{
emit UserBalanceChecked(actualUser, context.inputToken, balance);
if (balance < calc.saveAmount) {
emit InsufficientBalance(actualUser, context.inputToken,
calc.saveAmount, balance);
return false;
}
} catch {
emit InputTokenSavingsSkipped(actualUser, "Failed to check balance");
return false;
}
// Check user allowance before transfer
try IERC20(context.inputToken).allowance(actualUser, address(this)) returns
(uint256 allowance) {
emit AllowanceChecked(actualUser, context.inputToken, allowance);
if (allowance < calc.saveAmount) {
emit InsufficientAllowance(actualUser, context.inputToken,
calc.saveAmount, allowance);
return false;
}
} catch {
emit InputTokenSavingsSkipped(actualUser, "Failed to check allowance");
return false;
}
// Execute the savings transfer and processing
return _executeSavingsTransfer(actualUser, context.inputToken,
calc.saveAmount);
}
// Calculate input savings
function _calculateInputSavings(
SpendSaveStorage.SwapContext memory context
) internal view returns (SavingsCalculation memory) {
uint256 inputAmount = context.inputAmount;
uint256 saveAmount = calculateSavingsAmount(
inputAmount,
context.currentPercentage,
context.roundUpSavings
);
if (saveAmount == 0) {
return SavingsCalculation({
saveAmount: 0,
reducedSwapAmount: inputAmount
});
}
// Apply safety check for saving amount
saveAmount = _applySavingLimits(saveAmount, inputAmount);
// The reduced swap amount is what will go through the regular pool swap
// THIS IS IMPORTANT: The PoolManager will automatically adjust based on the
BeforeSwapDelta
uint256 reducedSwapAmount = inputAmount - saveAmount;
return SavingsCalculation({
saveAmount: saveAmount,
reducedSwapAmount: reducedSwapAmount
});
}
function _executeSavingsTransfer(
address actualUser,
address token,
uint256 amount
) internal returns (bool) {
emit SavingsTransferInitiated(actualUser, token, amount);
bool transferSuccess = false;
// Try to transfer tokens for savings using try/catch
try IERC20(token).transferFrom(actualUser, address(this), amount) {
transferSuccess = true;
// Double-check that we received the tokens
uint256 contractBalance = IERC20(token).balanceOf(address(this));
emit SavingsTransferSuccess(actualUser, token, amount, contractBalance);
// Apply fee and process savings
uint256 netAmount = _applyFeeAndProcessSavings(actualUser, token, amount);
emit NetAmountAfterFee(actualUser, token, netAmount);
// Emit event for tracking user savings update
uint256 userSavings = storage_.savings(actualUser, token);
emit UserSavingsUpdated(actualUser, token, userSavings);
return true;
} catch Error(string memory reason) {
emit SavingsTransferFailure(actualUser, token, amount, bytes(reason));
return false;
} catch (bytes memory reason) {
emit SavingsTransferFailure(actualUser, token, amount, reason);
return false;
}
}
// Helper to apply saving limits
function _applySavingLimits(uint256 saveAmount, uint256 inputAmount) internal pure
virtual returns (uint256) {
if (saveAmount >= inputAmount) {
return inputAmount / 2; // Save at most half to ensure swap continues
}
return saveAmount;
}
function processInputSavingsAfterSwap(
address actualUser,
SpendSaveStorage.SwapContext memory context
) external virtual nonReentrant returns (bool) {
if (msg.sender != storage_.spendSaveHook()) revert OnlyHook();
if (context.pendingSaveAmount == 0) return false;
// UPDATED: No need to transfer tokens from the user - we already have them via
take()
emit ProcessInputSavingsAfterSwapCalled(actualUser, context.inputToken,
context.pendingSaveAmount);
// Apply fee and process savings
uint256 processedAmount = _applyFeeAndProcessSavings(
actualUser,
context.inputToken,
context.pendingSaveAmount
);
// Return true if any amount was processed successfully
return processedAmount > 0;
}
// Helper to apply fee and process savings
function _applyFeeAndProcessSavings(
address actualUser,
address token,
uint256 amount
) internal returns (uint256) {
// Apply treasury fee
uint256 amountAfterFee = storage_.calculateAndTransferFee(actualUser, token,
amount);
// UPDATED: We already have the tokens via take(), so no need to transfer them
again
// Just process the savings directly
try savingsModule.processSavings(actualUser, token, amountAfterFee) {
emit SavingsProcessedSuccessfully(actualUser, token, amountAfterFee);
} catch Error(string memory reason) {
emit SavingsProcessingFailed(actualUser, token, bytes(reason));
return 0;
} catch (bytes memory reason) {
emit SavingsProcessingFailed(actualUser, token, reason);
return 0;
}
return amountAfterFee;
}
// Update user's saving strategy after swap - optimized to only update when needed
function updateSavingStrategy(address actualUser, SpendSaveStorage.SwapContext
memory context) external override nonReentrant {
if (msg.sender != address(storage_) && msg.sender != storage_.spendSaveHook())
revert OnlyHook();
// Early return if no auto-increment or no percentage change
if (!_shouldUpdateStrategy(actualUser, context.currentPercentage)) return;
// Get current strategy
SpendSaveStorage.SavingStrategy memory strategy =
_getUserSavingStrategy(actualUser);
// Update percentage
strategy.percentage = context.currentPercentage;
// Update the strategy in storage
_saveUserStrategy(actualUser, strategy);
emit SavingStrategyUpdated(actualUser, strategy.percentage);
}
// Helper to check if strategy should be updated
function _shouldUpdateStrategy(address user, uint256 currentPercentage) internal
view returns (bool) {
SpendSaveStorage.SavingStrategy memory strategy = _getUserSavingStrategy(user);
return strategy.autoIncrement > 0 && currentPercentage > strategy.percentage;
}
// Calculate savings amount based on percentage and rounding preference - gas
optimized
function calculateSavingsAmount(
uint256 amount,
uint256 percentage,
bool roundUp
) public pure override returns (uint256) {
if (percentage == 0) return 0;
uint256 saveAmount = (amount * percentage) / PERCENTAGE_DENOMINATOR;
if (roundUp && saveAmount > 0 && saveAmount % TOKEN_UNIT != 0) {
// Round up to nearest whole token unit (assuming 18 decimals)
uint256 remainder = saveAmount % TOKEN_UNIT;
saveAmount += (TOKEN_UNIT - remainder);
}
return saveAmount;
}
// Get current pool tick - cached function for gas optimization
function _getCurrentTick(PoolKey memory poolKey) internal view returns (int24) {
PoolId poolId = poolKey.toId();
// Use StateLibrary to get the current tick from pool manager
(,int24 currentTick,,) = StateLibrary.getSlot0(storage_.poolManager(), poolId);
return currentTick;
}
}
```
Then the slippageControl.sol
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./SpendSaveStorage.sol";
import "./ISlippageControlModule.sol";
import {ReentrancyGuard} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/utils/ReentrancyGua
rd.sol";
/**
* @title SlippageControl
* @dev Manages slippage settings and protection for swaps
*/
contract SlippageControl is ISlippageControlModule, ReentrancyGuard {
// Constants
uint256 private constant MAX_USER_SLIPPAGE = 1000; // 10%
uint256 private constant MAX_DEFAULT_SLIPPAGE = 500; // 5%
uint256 private constant BASIS_POINTS_DENOMINATOR = 10000;
// Storage reference
SpendSaveStorage public storage_;
// Events
event SlippageToleranceSet(address indexed user, uint256 basisPoints);
event TokenSlippageToleranceSet(address indexed user, address indexed token,
uint256 basisPoints);
event SlippageActionSet(address indexed user, SpendSaveStorage.SlippageAction
action);
event DefaultSlippageToleranceSet(uint256 basisPoints);
event SlippageExceeded(address indexed user, address indexed fromToken, address
indexed toToken, uint256 fromAmount, uint256 actualToAmount, uint256 expectedMinimum);
event ModuleInitialized(address indexed storage_);
// Custom errors
error SlippageToleranceTooHigh(uint256 provided, uint256 max);
error OnlyTreasury();
error SlippageToleranceExceeded(uint256 received, uint256 expected);
error AlreadyInitialized();
error UnauthorizedCaller();
error OnlyUserOrHook();
// Constructor is empty since module will be initialized via initialize()
constructor() {}
modifier onlyAuthorized(address user) {
if (!_isAuthorizedCaller(user)) {
revert UnauthorizedCaller();
}
_;
}
modifier onlyTreasury() {
if (msg.sender != storage_.treasury()) {
revert OnlyTreasury();
}
_;
}
// Helper for authorization check
function _isAuthorizedCaller(address user) internal view returns (bool) {
return (msg.sender == user ||
msg.sender == address(storage_) ||
msg.sender == storage_.spendSaveHook());
}
// Initialize module with storage reference
function initialize(SpendSaveStorage _storage) external override {
if (address(storage_) != address(0)) revert AlreadyInitialized();
storage_ = _storage;
emit ModuleInitialized(address(_storage));
}
// Function for users to set their preferred slippage tolerance
function setSlippageTolerance(address user, uint256 basisPoints) external override
onlyAuthorized(user) nonReentrant {
_validateSlippageTolerance(basisPoints, MAX_USER_SLIPPAGE);
storage_.setUserSlippageTolerance(user, basisPoints);
emit SlippageToleranceSet(user, basisPoints);
}
pure {
// Helper to validate slippage tolerance
function _validateSlippageTolerance(uint256 basisPoints, uint256 maxValue) internal
if (basisPoints > maxValue) {
revert SlippageToleranceTooHigh(basisPoints, maxValue);
}
}
// Function for users to set token-specific slippage tolerance
function setTokenSlippageTolerance(address user, address token, uint256
basisPoints) external override onlyAuthorized(user) nonReentrant {
_validateSlippageTolerance(basisPoints, MAX_USER_SLIPPAGE);
storage_.setTokenSlippageTolerance(user, token, basisPoints);
emit TokenSlippageToleranceSet(user, token, basisPoints);
}
// Function for users to set their preferred action when slippage is exceeded
function setSlippageAction(address user, SpendSaveStorage.SlippageAction action)
external override onlyAuthorized(user) nonReentrant {
storage_.setSlippageExceededAction(user, action);
emit SlippageActionSet(user, action);
}
// Function for admin to set the default slippage tolerance
function setDefaultSlippageTolerance(uint256 basisPoints) external nonReentrant
onlyTreasury {
_validateSlippageTolerance(basisPoints, MAX_DEFAULT_SLIPPAGE);
storage_.setDefaultSlippageTolerance(basisPoints);
emit DefaultSlippageToleranceSet(basisPoints);
}
// Helper function to get minimum amount out based on slippage
function getMinimumAmountOut(
address user,
address fromToken,
address toToken,
uint256 amountIn,
uint256 customSlippageTolerance
) external view override returns (uint256) {
// Get the effective slippage tolerance to use for this specific token
uint256 slippageBps = getEffectiveSlippageTolerance(user, toToken,
customSlippageTolerance);
// Calculate expected output with slippage tolerance
return _calculateOutputWithSlippage(amountIn, slippageBps);
}
// Helper to calculate expected output with slippage
function _calculateOutputWithSlippage(uint256 expectedAmount, uint256 slippageBps)
internal pure returns (uint256) {
// Apply slippage tolerance (slippageBps is in basis points, 100 = 1%)
return expectedAmount * (BASIS_POINTS_DENOMINATOR - slippageBps) /
BASIS_POINTS_DENOMINATOR;
}
// Handle slippage exceeded according to user preferences
function handleSlippageExceeded(
address user,
address fromToken,
address toToken,
uint256 fromAmount,
uint256 receivedAmount,
uint256 expectedMinimum
) external override onlyAuthorized(user) nonReentrant returns (bool) {
// Calculate and emit slippage information
_emitSlippageExceeded(user, fromToken, toToken, fromAmount, receivedAmount,
expectedMinimum);
// Apply user's configured slippage action
return _applySlippageAction(user, receivedAmount, expectedMinimum);
}
// Helper to emit slippage exceeded event
function _emitSlippageExceeded(
address user,
address fromToken,
address toToken,
uint256 fromAmount,
uint256 receivedAmount,
uint256 expectedMinimum
) internal {
emit SlippageExceeded(
user,
fromToken,
toToken,
fromAmount,
receivedAmount,
expectedMinimum
);
}
// Helper to apply slippage action
function _applySlippageAction(
address user,
uint256 receivedAmount,
uint256 expectedMinimum
) internal view returns (bool) {
SpendSaveStorage.SlippageAction action = storage_.slippageExceededAction(user);
if (action == SpendSaveStorage.SlippageAction.REVERT) {
revert SlippageToleranceExceeded(receivedAmount, expectedMinimum);
}
// Default is to continue with the transaction (CONTINUE action)
return true;
}
// Helper function to get a user's effective slippage tolerance
function getEffectiveSlippageTolerance(
address user,
address token,
uint256 customSlippageTolerance
) internal view returns (uint256) {
// If custom slippage was provided for this specific transaction, use it
if (customSlippageTolerance > 0) {
return customSlippageTolerance;
}
// If user has token-specific preference, use that
uint256 tokenSpecificSlippage = storage_.tokenSlippageTolerance(user, token);
if (tokenSpecificSlippage > 0) {
return tokenSpecificSlippage;
}
// If user has a global persistent preference, use that
uint256 userSlippage = storage_.userSlippageTolerance(user);
if (userSlippage > 0) {
return userSlippage;
}
// Otherwise use the contract default
return storage_.defaultSlippageTolerance();
}
}
```
Then this is the Token.sol
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./SpendSaveStorage.sol";
import "./ITokenModule.sol";
import {ReentrancyGuard} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/utils/ReentrancyGua
rd.sol";
/**
* @title Token
* @dev Implements ERC6909 token standard for representing savings
*/
contract Token is ITokenModule, ReentrancyGuard {
// Storage reference
SpendSaveStorage public storage_;
// ERC6909 interface constants
bytes4 constant private _ERC6909_RECEIVED = 0x05e3242b; //
bytes4(keccak256("onERC6909Received(address,address,uint256,uint256,bytes)"))
address public savingsModule;
// Events (same as in ERC6909)
event Transfer(address indexed sender, address indexed receiver, uint256 indexed
id, uint256 amount);
event Approval(address indexed owner, address indexed spender, uint256 indexed id,
uint256 amount);
event TokenRegistered(address indexed token, uint256 indexed tokenId);
event ModuleInitialized(address indexed storage_);
event SavingsTokenMinted(address indexed user, address indexed token, uint256
tokenId, uint256 amount);
event SavingsTokenBurned(address indexed user, address indexed token, uint256
tokenId, uint256 amount);
event TreasuryFeeCollected(address indexed user, address token, uint256 amount);
// Custom errors
error InvalidTokenAddress();
error TokenNotRegistered(address token);
error InsufficientBalance(address owner, uint256 tokenId, uint256 requested,
uint256 available);
error InsufficientAllowance(address owner, address spender, uint256 tokenId,
uint256 requested, uint256 available);
error TransferToZeroAddress();
error TransferFromZeroAddress();
error ERC6909ReceiverRejected();
error NonERC6909ReceiverImplementer(string reason);
error NonERC6909ReceiverImplementerNoReason();
error AlreadyInitialized();
error UnauthorizedCaller();
// Constructor is empty since module will be initialized via initialize()
constructor() {}
modifier onlyAuthorized(address user) {
if (msg.sender != user &&
msg.sender != address(storage_) &&
msg.sender != storage_.spendSaveHook() &&
msg.sender != savingsModule) { // Add this line
revert UnauthorizedCaller();
}
_;
}
// Initialize module with storage reference
function initialize(SpendSaveStorage _storage) external override {
if(address(storage_) != address(0)) revert AlreadyInitialized();
storage_ = _storage;
emit ModuleInitialized(address(_storage));
}
function setModuleReferences(address _savingsModule) external {
if (msg.sender != storage_.owner()) revert UnauthorizedCaller();
savingsModule = _savingsModule;
}
// Register a new token and assign it an ID for ERC-6909
function registerToken(address token) public override nonReentrant returns
(uint256) {
if (token == address(0)) revert InvalidTokenAddress();
// If token already registered, return existing ID
if (storage_.tokenToId(token) != 0) {
return storage_.tokenToId(token);
}
// Assign new ID
uint256 newId = storage_.getNextTokenId();
storage_.incrementNextTokenId();
// Update mappings
storage_.setTokenToId(token, newId);
storage_.setIdToToken(newId, token);
emit TokenRegistered(token, newId);
return newId;
}
// Mint ERC-6909 tokens to represent savings
function mintSavingsToken(address user, address token, uint256 amount) external
override onlyAuthorized(user) {
uint256 tokenId = _getOrRegisterTokenId(token);
// Just mint tokens directly to user with the full amount
_mintDirectly(user, tokenId, token, amount);
}
// Helper to mint tokens directly without fee calculation
function _mintDirectly(address user, uint256 tokenId, address token, uint256
amount) internal {
// Update user's balance directly without fee calculation
storage_.increaseBalance(user, tokenId, amount);
// Emit events
emit Transfer(address(0), user, tokenId, amount);
emit SavingsTokenMinted(user, token, tokenId, amount);
}
// Helper to get or register token ID
function _getOrRegisterTokenId(address token) internal returns (uint256) {
uint256 tokenId = storage_.tokenToId(token);
if (tokenId == 0) {
tokenId = registerToken(token);
}
return tokenId;
}
// Burn ERC-6909 tokens when withdrawing
function burnSavingsToken(address user, address token, uint256 amount) external
override onlyAuthorized(user) nonReentrant {
uint256 tokenId = storage_.tokenToId(token);
if (tokenId == 0) revert TokenNotRegistered(token);
uint256 currentBalance = storage_.getBalance(user, tokenId);
if (currentBalance < amount) {
revert InsufficientBalance(user, tokenId, amount, currentBalance);
}
storage_.decreaseBalance(user, tokenId, amount);
emit Transfer(user, address(0), tokenId, amount);
emit SavingsTokenBurned(user, token, tokenId, amount);
}
// ERC6909: Get balance of tokens for an owner
function balanceOf(address owner, uint256 id) external view override returns
(uint256) {
return storage_.getBalance(owner, id);
}
// ERC6909: Get allowance for a spender
function allowance(address owner, address spender, uint256 id) external view
override returns (uint256) {
return storage_.getAllowance(owner, spender, id);
}
// ERC6909: Transfer tokens
function transfer(address sender, address receiver, uint256 id, uint256 amount)
external override onlyAuthorized(sender) nonReentrant returns (bool) {
if (receiver == address(0)) revert TransferToZeroAddress();
uint256 senderBalance = storage_.getBalance(sender, id);
if (senderBalance < amount) {
revert InsufficientBalance(sender, id, amount, senderBalance);
}
storage_.decreaseBalance(sender, id, amount);
storage_.increaseBalance(receiver, id, amount);
emit Transfer(sender, receiver, id, amount);
return true;
}
// ERC6909: Transfer tokens on behalf of another user
function transferFrom(
address operator,
address sender,
address receiver,
uint256 id,
uint256 amount
) external override onlyAuthorized(operator) nonReentrant returns (bool) {
_validateTransferAddresses(sender, receiver);
_checkSenderBalance(sender, id, amount);
// Check allowance if needed
if (operator != sender) {
_checkAndUpdateAllowance(sender, operator, id, amount);
}
// Execute the transfer
_executeTransfer(sender, receiver, id, amount);
return true;
}
function _validateTransferAddresses(address sender, address receiver) internal pure
{
if (sender == address(0)) revert TransferFromZeroAddress();
if (receiver == address(0)) revert TransferToZeroAddress();
}
function _checkSenderBalance(address sender, uint256 id, uint256 amount) internal
view {
uint256 senderBalance = storage_.getBalance(sender, id);
if (senderBalance < amount) {
revert InsufficientBalance(sender, id, amount, senderBalance);
}
}
function _checkAndUpdateAllowance(address owner, address spender, uint256 id,
uint256 amount) internal {
uint256 currentAllowance = storage_.getAllowance(owner, spender, id);
if (currentAllowance < amount) {
revert InsufficientAllowance(owner, spender, id, amount, currentAllowance);
}
storage_.setAllowance(owner, spender, id, currentAllowance - amount);
}
function _executeTransfer(address sender, address receiver, uint256 id, uint256
amount) internal {
storage_.decreaseBalance(sender, id, amount);
storage_.increaseBalance(receiver, id, amount);
emit Transfer(sender, receiver, id, amount);
}
// ERC6909: Approve spending limit
function approve(address owner, address spender, uint256 id, uint256 amount)
external override onlyAuthorized(owner) nonReentrant returns (bool) {
storage_.setAllowance(owner, spender, id, amount);
emit Approval(owner, spender, id, amount);
return true;
}
// ERC6909: Safe transfer with receiver check
function safeTransfer(
address sender,
address receiver,
uint256 id,
uint256 amount,
bytes calldata data
) external override onlyAuthorized(sender) nonReentrant returns (bool) {
// Validate receiver
if (receiver == address(0)) revert TransferToZeroAddress();
// Check sender balance
_checkSenderBalance(sender, id, amount);
// Execute the transfer
_executeTransfer(sender, receiver, id, amount);
// Check if receiver is a contract and call onERC6909Received
// Note the sender is both the operator and from address in this case
_checkERC6909Receiver(sender, sender, receiver, id, amount, data);
return true;
}
// ERC6909: Safe transferFrom with receiver check
function safeTransferFrom(
address operator,
address sender,
address receiver,
uint256 id,
uint256 amount,
bytes calldata data
) external override onlyAuthorized(operator) nonReentrant returns (bool) {
// Reuse the same checks we already implemented
_validateTransferAddresses(sender, receiver);
_checkSenderBalance(sender, id, amount);
// Check allowance if needed
if (operator != sender) {
_checkAndUpdateAllowance(sender, operator, id, amount);
}
// Execute the transfer
_executeTransfer(sender, receiver, id, amount);
// Check if receiver is a contract and call onERC6909Received
_checkERC6909Receiver(operator, sender, receiver, id, amount, data);
return true;
}
function _checkERC6909Receiver(
address operator,
address sender,
address receiver,
uint256 id,
uint256 amount,
bytes calldata data
) internal {
if (_isContract(receiver)) {
_callERC6909Receiver(operator, sender, receiver, id, amount, data);
}
}
function _callERC6909Receiver(
address operator,
address sender,
address receiver,
uint256 id,
uint256 amount,
bytes calldata data
) internal {
try IERC6909Receiver(receiver).onERC6909Received(operator, sender, id, amount,
data) returns (bytes4 retval) {
if (retval != _ERC6909_RECEIVED) {
revert ERC6909ReceiverRejected();
}
} catch {
} catch Error(string memory reason) {
revert NonERC6909ReceiverImplementer(reason);
revert NonERC6909ReceiverImplementerNoReason();
}
}
// Function to query token ID by token address
function getTokenId(address token) external view override returns (uint256) {
return storage_.tokenToId(token);
}
// Function to query token address by token ID
function getTokenAddress(uint256 id) external view override returns (address) {
return storage_.idToToken(id);
}
// Helper to check if an address is a contract
function _isContract(address addr) internal view returns (bool) {
uint256 size;
assembly {
size := extcodesize(addr)
}
return size > 0;
}
}
interface IERC6909Receiver {
function onERC6909Received(
address operator,
address from,
uint256 id,
uint256 amount,
bytes calldata data
) external returns (bytes4);
}
```
Than this is the Savings.sol
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./SpendSaveStorage.sol";
import "./ITokenModule.sol";
import {ReentrancyGuard} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/utils/ReentrancyGua
rd.sol";
/**
* @title Token
* @dev Implements ERC6909 token standard for representing savings
*/
contract Token is ITokenModule, ReentrancyGuard {
// Storage reference
SpendSaveStorage public storage_;
// ERC6909 interface constants
bytes4 constant private _ERC6909_RECEIVED = 0x05e3242b; //
bytes4(keccak256("onERC6909Received(address,address,uint256,uint256,bytes)"))
address public savingsModule;
// Events (same as in ERC6909)
event Transfer(address indexed sender, address indexed receiver, uint256 indexed
id, uint256 amount);
event Approval(address indexed owner, address indexed spender, uint256 indexed id,
uint256 amount);
event TokenRegistered(address indexed token, uint256 indexed tokenId);
event ModuleInitialized(address indexed storage_);
event SavingsTokenMinted(address indexed user, address indexed token, uint256
tokenId, uint256 amount);
event SavingsTokenBurned(address indexed user, address indexed token, uint256
tokenId, uint256 amount);
event TreasuryFeeCollected(address indexed user, address token, uint256 amount);
// Custom errors
error InvalidTokenAddress();
error TokenNotRegistered(address token);
error InsufficientBalance(address owner, uint256 tokenId, uint256 requested,
uint256 available);
error InsufficientAllowance(address owner, address spender, uint256 tokenId,
uint256 requested, uint256 available);
error TransferToZeroAddress();
error TransferFromZeroAddress();
error ERC6909ReceiverRejected();
error NonERC6909ReceiverImplementer(string reason);
error NonERC6909ReceiverImplementerNoReason();
error AlreadyInitialized();
error UnauthorizedCaller();
// Constructor is empty since module will be initialized via initialize()
constructor() {}
modifier onlyAuthorized(address user) {
if (msg.sender != user &&
msg.sender != address(storage_) &&
msg.sender != storage_.spendSaveHook() &&
msg.sender != savingsModule) { // Add this line
revert UnauthorizedCaller();
}
_;
}
// Initialize module with storage reference
function initialize(SpendSaveStorage _storage) external override {
if(address(storage_) != address(0)) revert AlreadyInitialized();
storage_ = _storage;
emit ModuleInitialized(address(_storage));
}
function setModuleReferences(address _savingsModule) external {
if (msg.sender != storage_.owner()) revert UnauthorizedCaller();
savingsModule = _savingsModule;
}
// Register a new token and assign it an ID for ERC-6909
function registerToken(address token) public override nonReentrant returns
(uint256) {
if (token == address(0)) revert InvalidTokenAddress();
// If token already registered, return existing ID
if (storage_.tokenToId(token) != 0) {
return storage_.tokenToId(token);
}
// Assign new ID
uint256 newId = storage_.getNextTokenId();
storage_.incrementNextTokenId();
// Update mappings
storage_.setTokenToId(token, newId);
storage_.setIdToToken(newId, token);
emit TokenRegistered(token, newId);
return newId;
}
// Mint ERC-6909 tokens to represent savings
function mintSavingsToken(address user, address token, uint256 amount) external
override onlyAuthorized(user) {
uint256 tokenId = _getOrRegisterTokenId(token);
// Just mint tokens directly to user with the full amount
_mintDirectly(user, tokenId, token, amount);
}
// Helper to mint tokens directly without fee calculation
function _mintDirectly(address user, uint256 tokenId, address token, uint256
amount) internal {
// Update user's balance directly without fee calculation
storage_.increaseBalance(user, tokenId, amount);
// Emit events
emit Transfer(address(0), user, tokenId, amount);
emit SavingsTokenMinted(user, token, tokenId, amount);
}
// Helper to get or register token ID
function _getOrRegisterTokenId(address token) internal returns (uint256) {
uint256 tokenId = storage_.tokenToId(token);
if (tokenId == 0) {
tokenId = registerToken(token);
}
return tokenId;
}
// Burn ERC-6909 tokens when withdrawing
function burnSavingsToken(address user, address token, uint256 amount) external
override onlyAuthorized(user) nonReentrant {
uint256 tokenId = storage_.tokenToId(token);
if (tokenId == 0) revert TokenNotRegistered(token);
uint256 currentBalance = storage_.getBalance(user, tokenId);
if (currentBalance < amount) {
revert InsufficientBalance(user, tokenId, amount, currentBalance);
}
storage_.decreaseBalance(user, tokenId, amount);
emit Transfer(user, address(0), tokenId, amount);
emit SavingsTokenBurned(user, token, tokenId, amount);
}
// ERC6909: Get balance of tokens for an owner
function balanceOf(address owner, uint256 id) external view override returns
(uint256) {
return storage_.getBalance(owner, id);
}
// ERC6909: Get allowance for a spender
function allowance(address owner, address spender, uint256 id) external view
override returns (uint256) {
return storage_.getAllowance(owner, spender, id);
}
// ERC6909: Transfer tokens
function transfer(address sender, address receiver, uint256 id, uint256 amount)
external override onlyAuthorized(sender) nonReentrant returns (bool) {
if (receiver == address(0)) revert TransferToZeroAddress();
uint256 senderBalance = storage_.getBalance(sender, id);
if (senderBalance < amount) {
revert InsufficientBalance(sender, id, amount, senderBalance);
}
storage_.decreaseBalance(sender, id, amount);
storage_.increaseBalance(receiver, id, amount);
emit Transfer(sender, receiver, id, amount);
return true;
}
// ERC6909: Transfer tokens on behalf of another user
function transferFrom(
address operator,
address sender,
address receiver,
uint256 id,
uint256 amount
) external override onlyAuthorized(operator) nonReentrant returns (bool) {
_validateTransferAddresses(sender, receiver);
_checkSenderBalance(sender, id, amount);
// Check allowance if needed
if (operator != sender) {
_checkAndUpdateAllowance(sender, operator, id, amount);
}
// Execute the transfer
_executeTransfer(sender, receiver, id, amount);
return true;
}
function _validateTransferAddresses(address sender, address receiver) internal pure
{
if (sender == address(0)) revert TransferFromZeroAddress();
if (receiver == address(0)) revert TransferToZeroAddress();
}
view {
function _checkSenderBalance(address sender, uint256 id, uint256 amount) internal
uint256 senderBalance = storage_.getBalance(sender, id);
if (senderBalance < amount) {
revert InsufficientBalance(sender, id, amount, senderBalance);
}
}
function _checkAndUpdateAllowance(address owner, address spender, uint256 id,
uint256 amount) internal {
uint256 currentAllowance = storage_.getAllowance(owner, spender, id);
if (currentAllowance < amount) {
revert InsufficientAllowance(owner, spender, id, amount, currentAllowance);
}
storage_.setAllowance(owner, spender, id, currentAllowance - amount);
}
function _executeTransfer(address sender, address receiver, uint256 id, uint256
amount) internal {
storage_.decreaseBalance(sender, id, amount);
storage_.increaseBalance(receiver, id, amount);
emit Transfer(sender, receiver, id, amount);
}
// ERC6909: Approve spending limit
function approve(address owner, address spender, uint256 id, uint256 amount)
external override onlyAuthorized(owner) nonReentrant returns (bool) {
storage_.setAllowance(owner, spender, id, amount);
emit Approval(owner, spender, id, amount);
return true;
}
// ERC6909: Safe transfer with receiver check
function safeTransfer(
address sender,
address receiver,
uint256 id,
uint256 amount,
bytes calldata data
) external override onlyAuthorized(sender) nonReentrant returns (bool) {
// Validate receiver
if (receiver == address(0)) revert TransferToZeroAddress();
// Check sender balance
_checkSenderBalance(sender, id, amount);
// Execute the transfer
_executeTransfer(sender, receiver, id, amount);
// Check if receiver is a contract and call onERC6909Received
// Note the sender is both the operator and from address in this case
_checkERC6909Receiver(sender, sender, receiver, id, amount, data);
return true;
}
// ERC6909: Safe transferFrom with receiver check
function safeTransferFrom(
address operator,
address sender,
address receiver,
uint256 id,
uint256 amount,
bytes calldata data
) external override onlyAuthorized(operator) nonReentrant returns (bool) {
// Reuse the same checks we already implemented
_validateTransferAddresses(sender, receiver);
_checkSenderBalance(sender, id, amount);
// Check allowance if needed
if (operator != sender) {
_checkAndUpdateAllowance(sender, operator, id, amount);
}
// Execute the transfer
_executeTransfer(sender, receiver, id, amount);
// Check if receiver is a contract and call onERC6909Received
_checkERC6909Receiver(operator, sender, receiver, id, amount, data);
return true;
}
function _checkERC6909Receiver(
address operator,
address sender,
address receiver,
uint256 id,
uint256 amount,
bytes calldata data
) internal {
if (_isContract(receiver)) {
_callERC6909Receiver(operator, sender, receiver, id, amount, data);
}
}
function _callERC6909Receiver(
address operator,
address sender,
address receiver,
uint256 id,
uint256 amount,
bytes calldata data
) internal {
try IERC6909Receiver(receiver).onERC6909Received(operator, sender, id, amount,
data) returns (bytes4 retval) {
if (retval != _ERC6909_RECEIVED) {
revert ERC6909ReceiverRejected();
}
} catch {
} catch Error(string memory reason) {
revert NonERC6909ReceiverImplementer(reason);
revert NonERC6909ReceiverImplementerNoReason();
}
}
// Function to query token ID by token address
function getTokenId(address token) external view override returns (uint256) {
return storage_.tokenToId(token);
}
// Function to query token address by token ID
function getTokenAddress(uint256 id) external view override returns (address) {
return storage_.idToToken(id);
}
// Helper to check if an address is a contract
function _isContract(address addr) internal view returns (bool) {
uint256 size;
assembly {
size := extcodesize(addr)
}
return size > 0;
}
}
interface IERC6909Receiver {
function onERC6909Received(
address operator,
address from,
uint256 id,
uint256 amount,
bytes calldata data
) external returns (bytes4);
}
```
Then this is the DCA.sol
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IERC20} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.
sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PoolKey} from "lib/v4-periphery/lib/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from
"lib/v4-periphery/lib/v4-core/src/types/PoolId.sol";
import {IPoolManager} from
"lib/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {BalanceDelta} from "lib/v4-periphery/lib/v4-core/src/types/BalanceDelta.sol";
import {Currency} from "lib/v4-periphery/lib/v4-core/src/types/Currency.sol";
import {TickMath} from "lib/v4-periphery/lib/v4-core/src/libraries/TickMath.sol";
import {IHooks} from "lib/v4-periphery/lib/v4-core/src/interfaces/IHooks.sol";
import {StateLibrary} from
"lib/v4-periphery/lib/v4-core/src/libraries/StateLibrary.sol";
import {ReentrancyGuard} from
"lib/v4-periphery/lib/v4-core/lib/openzeppelin-contracts/contracts/utils/ReentrancyGua
rd.sol";
import "./SpendSaveStorage.sol";
import "./IDCAModule.sol";
import "./ITokenModule.sol";
import "./ISlippageControlModule.sol";
import "./ISavingsModule.sol";
/**
* @title DCA
* @dev Manages dollar-cost averaging functionality
*/
contract DCA is IDCAModule, ReentrancyGuard {
using SafeERC20 for IERC20;
using PoolIdLibrary for PoolKey;
// Constants
uint24 private constant DEFAULT_FEE_TIER = 3000; // 0.3%
int24 private constant DEFAULT_TICK_SPACING = 60;
uint256 private constant MAX_MULTIPLIER = 100; // Maximum 2x multiplier (100%)
struct SwapExecutionParams {
uint256 amount;
uint256 minAmountOut;
uint160 sqrtPriceLimitX96;
}
struct SwapExecutionResult {
uint256 receivedAmount;
bool success;
}
struct TickMovement {
int24 delta;
bool isPositive;
}
// Storage reference
SpendSaveStorage public storage_;
// Module references
ITokenModule public tokenModule;
ISlippageControlModule public slippageModule;
ISavingsModule public savingsModule;
// Events
event DCAEnabled(address indexed user, address indexed targetToken, bool enabled);
event DCATickStrategySet(address indexed user, int24 tickDelta, uint256
tickExpiryTime, bool onlyImprovePrice);
event DCAQueued(address indexed user, address fromToken, address toToken, uint256
amount, int24 executionTick);
event DCAExecuted(address indexed user, address fromToken, address toToken, uint256
fromAmount, uint256 toAmount);
event TickUpdated(PoolId indexed poolId, int24 oldTick, int24 newTick);
event ModuleReferencesSet(address tokenModule, address slippageModule, address
savingsModule);
event ModuleInitialized(address storage_);
event TreasuryFeeCollected(address indexed user, address token, uint256 amount);
event TransferFailure(address indexed user, address token, uint256 amount, bytes
reason);
event SwapExecutionZeroOutput(uint256 amount, bool zeroForOne);
event SpecificTokenSwapProcessed(
address indexed user,
address indexed fromToken,
address indexed toToken,
uint256 inputAmount,
uint256 outputAmount
);
event SpecificTokenSwapFailed(
address indexed user,
address indexed fromToken,
address indexed toToken,
string reason
);
// Custom errors
error DCANotEnabled();
error NoTargetTokenSet();
error InsufficientSavings(address token, uint256 requested, uint256 available);
error InvalidDCAExecution();
error ZeroAmountSwap();
error SwapExecutionFailed();
error SlippageToleranceExceeded(uint256 received, uint256 expected);
error AlreadyInitialized();
error OnlyOwner();
error UnauthorizedCaller();
error TokenTransferFailed();
// Constructor is empty since module will be initialized via initialize()
constructor() {}
modifier onlyAuthorized(address user) {
if (!_isAuthorizedCaller(user)) {
revert UnauthorizedCaller();
}
_;
}
modifier onlyOwner() {
if (msg.sender != storage_.owner()) {
revert OnlyOwner();
}
_;
}
// Helper for authorization check
function _isAuthorizedCaller(address user) internal view returns (bool) {
return (msg.sender == user ||
msg.sender == address(storage_) ||
msg.sender == storage_.spendSaveHook());
}
// Initialize module with storage reference
function initialize(SpendSaveStorage _storage) external override nonReentrant {
if (address(storage_) != address(0)) {
revert AlreadyInitialized();
}
storage_ = _storage;
emit ModuleInitialized(address(_storage));
}
// Set references to other modules
function setModuleReferences(address _tokenModule, address _slippageModule, address
_savingsModule) external nonReentrant onlyOwner {
tokenModule = ITokenModule(_tokenModule);
slippageModule = ISlippageControlModule(_slippageModule);
savingsModule = ISavingsModule(_savingsModule);
emit ModuleReferencesSet(_tokenModule, _slippageModule, _savingsModule);
}
// Helper function to get current strategy parameters
function _getCurrentStrategyParams(address user) internal view returns (
uint256 percentage,
uint256 autoIncrement,
uint256 maxPercentage,
uint256 goalAmount,
bool roundUpSavings,
SpendSaveStorage.SavingsTokenType savingsTokenType,
address specificSavingsToken
) {
(
percentage,
autoIncrement,
maxPercentage,
goalAmount,
roundUpSavings,
, // Ignore current enableDCA value
savingsTokenType,
specificSavingsToken
) = storage_.getUserSavingStrategy(user);
return (
percentage,
autoIncrement,
maxPercentage,
goalAmount,
roundUpSavings,
savingsTokenType,
specificSavingsToken
);
}
// Enable DCA into a target token
function enableDCA(address user, address targetToken, bool enabled) external
override onlyAuthorized(user) nonReentrant {
// Get current strategy parameters
(
uint256 percentage,
uint256 autoIncrement,
uint256 maxPercentage,
uint256 goalAmount,
bool roundUpSavings,
SpendSaveStorage.SavingsTokenType savingsTokenType,
address specificSavingsToken
) = _getCurrentStrategyParams(user);
// Update the strategy with the new enableDCA value
_updateSavingStrategy(
user,
percentage,
autoIncrement,
maxPercentage,
goalAmount,
roundUpSavings,
enabled,
savingsTokenType,
specificSavingsToken,
targetToken
);
emit DCAEnabled(user, targetToken, enabled);
}
// Helper to update saving strategy
function _updateSavingStrategy(
address user,
uint256 percentage,
uint256 autoIncrement,
uint256 maxPercentage,
uint256 goalAmount,
bool roundUpSavings,
bool enableDCA,
SpendSaveStorage.SavingsTokenType savingsTokenType,
address specificSavingsToken,
address targetToken
) internal {
// Update the strategy with new values
storage_.setUserSavingStrategy(
user,
percentage,
autoIncrement,
maxPercentage,
goalAmount,
roundUpSavings,
enableDCA,
savingsTokenType,
specificSavingsToken
);
// Set the target token
storage_.setDcaTargetToken(user, targetToken);
}
// Helper function to get the current custom slippage tolerance
function _getCurrentCustomSlippageTolerance(address user) internal view returns
(uint256) {
(,,,,,uint256 customSlippageTolerance) = storage_.getDcaTickStrategy(user);
return customSlippageTolerance;
}
// Set DCA tick strategy
function setDCATickStrategy(
address user,
int24 tickDelta,
uint256 tickExpiryTime,
bool onlyImprovePrice,
int24 minTickImprovement,
bool dynamicSizing
) external override onlyAuthorized(user) nonReentrant {
// Get current slippage tolerance to keep it the same
uint256 customSlippageTolerance = _getCurrentCustomSlippageTolerance(user);
// Update the strategy
storage_.setDcaTickStrategy(
user,
tickDelta,
tickExpiryTime,
onlyImprovePrice,
minTickImprovement,
dynamicSizing,
customSlippageTolerance
);
emit DCATickStrategySet(user, tickDelta, tickExpiryTime, onlyImprovePrice);
}
// Queue DCA from a savings token generated in a swap
function queueDCAFromSwap(
address user,
address fromToken,
SpendSaveStorage.SwapContext memory context
) external override onlyAuthorized(user) nonReentrant {
// Validate conditions for DCA queue
if (!_shouldQueueDCA(context, fromToken)) return;
// Get savings amount for this token
uint256 amount = storage_.savings(user, fromToken);
if (amount == 0) return;
// Create the pool key and queue the DCA execution
PoolKey memory poolKey = storage_.createPoolKey(fromToken,
context.dcaTargetToken);
queueDCAExecution(
user,
fromToken,
context.dcaTargetToken,
amount,
poolKey,
context.currentTick,
0 // No custom slippage, use default
);
}
// Helper to check if DCA should be queued
function _shouldQueueDCA(SpendSaveStorage.SwapContext memory context, address
fromToken) internal pure returns (bool) {
return context.enableDCA &&
context.dcaTargetToken != address(0) &&
fromToken != context.dcaTargetToken;
}
// Helper function to determine whether the swap is zeroForOne
function _isZeroForOne(address fromToken, address toToken) internal pure returns
(bool) {
return fromToken < toToken;
}
// Helper to get execution tick and deadline
function _getExecutionDetails(
address user,
PoolKey memory poolKey,
int24 currentTick,
bool zeroForOne
) internal view returns (int24 executionTick, uint256 deadline) {
executionTick = calculateDCAExecutionTick(user, poolKey, currentTick,
zeroForOne);
// Get tick expiry time
(,uint256 tickExpiryTime,,,,) = storage_.getDcaTickStrategy(user);
deadline = block.timestamp + tickExpiryTime;
return (executionTick, deadline);
}
// Queue DCA for execution at optimal tick
function queueDCAExecution(
address user,
address fromToken,
address toToken,
uint256 amount,
PoolKey memory poolKey,
int24 currentTick,
uint256 customSlippageTolerance
) public override onlyAuthorized(user) nonReentrant {
// Determine swap direction
bool zeroForOne = _isZeroForOne(fromToken, toToken);
// Get execution tick and deadline
(int24 executionTick, uint256 deadline) = _getExecutionDetails(
user,
poolKey,
currentTick,
zeroForOne
);
// Add to queue
storage_.addToDcaQueue(
user,
fromToken,
toToken,
amount,
executionTick,
deadline,
customSlippageTolerance
);
emit DCAQueued(user, fromToken, toToken, amount, executionTick);
}
// Helper function to validate DCA prerequisites
function _validateDCAPrerequisites(
address user,
address fromToken,
uint256 amount
) internal view returns (address targetToken) {
// Check if DCA is enabled
(,,,,, bool enableDCA,,) = storage_.getUserSavingStrategy(user);
if (!enableDCA) revert DCANotEnabled();
targetToken = storage_.dcaTargetToken(user);
if (targetToken == address(0)) revert NoTargetTokenSet();
uint256 userSavings = storage_.savings(user, fromToken);
if (userSavings < amount) {
revert InsufficientSavings(fromToken, amount, userSavings);
}
return targetToken;
}
// Execute a DCA swap
function executeDCA(
address user,
address fromToken,
uint256 amount,
uint256 customSlippageTolerance
) external override onlyAuthorized(user) nonReentrant {
// Validate prerequisites and get target token
address targetToken = _validateDCAPrerequisites(user, fromToken, amount);
// Create pool key for the swap
PoolKey memory poolKey = storage_.createPoolKey(fromToken, targetToken);
// Get current tick
int24 currentTick = getCurrentTick(poolKey);
// Determine execution strategy
_executeDCAWithStrategy(
user,
fromToken,
targetToken,
amount,
poolKey,
currentTick,
customSlippageTolerance
);
}
// Helper for DCA execution strategy determination
function _executeDCAWithStrategy(
address user,
address fromToken,
address targetToken,
uint256 amount,
PoolKey memory poolKey,
int24 currentTick,
uint256 customSlippageTolerance
) internal {
// Check if there's a tick strategy
(int24 tickDelta, uint256 tickExpiryTime,,,,) =
storage_.getDcaTickStrategy(user);
bool shouldQueueExecution = (tickDelta != 0 && tickExpiryTime != 0);
if (shouldQueueExecution) {
// Queue for execution at optimal tick
queueDCAExecution(
user,
fromToken,
targetToken,
amount,
poolKey,
currentTick,
customSlippageTolerance
);
} else {
// No tick strategy, execute immediately
bool zeroForOne = _isZeroForOne(fromToken, targetToken);
executeDCASwap(
user,
fromToken,
targetToken,
amount,
poolKey,
zeroForOne,
customSlippageTolerance
);
}
}
// Process all queued DCAs that should execute at current tick
function processQueuedDCAs(address user, PoolKey memory poolKey) external override
onlyAuthorized(user) nonReentrant {
int24 currentTick = getCurrentTick(poolKey);
uint256 queueLength = storage_.getDcaQueueLength(user);
for (uint256 i = 0; i < queueLength; i++) {
_processQueueItem(user, i, poolKey, currentTick);
}
}
function processSpecificTokenSwap(
address user,
address fromToken,
address toToken,
uint256 amount
) external onlyAuthorized(user) nonReentrant returns (bool) {
// Create pool key for the swap
PoolKey memory poolKey = storage_.createPoolKey(fromToken, toToken);
// Get current tick
int24 currentTick = getCurrentTick(poolKey);
// Determine if this is a zero for one swap
bool zeroForOne = fromToken < toToken;
// Get slippage tolerance
uint256 slippageTolerance = _getCurrentCustomSlippageTolerance(user);
if (slippageTolerance == 0) {
// Use default if not set
slippageTolerance = storage_.defaultSlippageTolerance();
}
// Execute the swap directly
try this.executeDCASwap(
user,
fromToken,
toToken,
amount,
poolKey,
zeroForOne,
slippageTolerance
) returns (uint256 receivedAmount) {
// Check if we got any tokens
if (receivedAmount > 0) {
// Process the specific token savings after swap
savingsModule.processSavings(user, toToken, receivedAmount);
emit SpecificTokenSwapProcessed(user, fromToken, toToken, amount,
receivedAmount);
return true;
} else {
emit SpecificTokenSwapFailed(user, fromToken, toToken, "Zero tokens
received");
return false;
}
} catch Error(string memory reason) {
emit SpecificTokenSwapFailed(user, fromToken, toToken, reason);
return false;
} catch {
emit SpecificTokenSwapFailed(user, fromToken, toToken, "Unknown error");
return false;
}
}
// Helper to process a single queue item
function _processQueueItem(address user, uint256 index, PoolKey memory poolKey,
int24 currentTick) internal {
// Get the DCA execution info
(
address fromToken,
address toToken,
uint256 amount,
int24 executionTick,
uint256 deadline,
bool executed,
uint256 customSlippageTolerance
) = storage_.getDcaQueueItem(user, index);
// Create a DCAExecution struct for easier handling
SpendSaveStorage.DCAExecution memory dca = SpendSaveStorage.DCAExecution({
fromToken: fromToken,
toToken: toToken,
amount: amount,
executionTick: executionTick,
deadline: deadline,
executed: executed,
customSlippageTolerance: customSlippageTolerance
});
if (!executed && shouldExecuteDCAAtTick(user, dca, currentTick)) {
executeDCAAtIndex(user, index, poolKey, currentTick);
}
}
// Get current pool tick
function getCurrentTick(PoolKey memory poolKey) public override nonReentrant
returns (int24) {
PoolId poolId = poolKey.toId();
// Get current tick from pool manager
(,int24 currentTick,,) = StateLibrary.getSlot0(storage_.poolManager(), poolId);
// Update stored tick if changed
_updateStoredTick(poolId, currentTick);
return currentTick;
}
// Helper to update stored tick
function _updateStoredTick(PoolId poolId, int24 currentTick) internal {
int24 oldTick = storage_.poolTicks(poolId);
if (oldTick != currentTick) {
storage_.setPoolTick(poolId, currentTick);
emit TickUpdated(poolId, oldTick, currentTick);
}
}
// Execute a specific DCA from the queue
function executeDCAAtIndex(
address user,
uint256 index,
PoolKey memory poolKey,
int24 currentTick
) internal {
// Validate and retrieve execution parameters
(
address fromToken,
address toToken,
uint256 amount,
bool executed,
bool zeroForOne,
uint256 swapAmount,
uint256 customSlippageTolerance
) = _prepareExecutionParameters(user, index, currentTick);
if (executed) revert InvalidDCAExecution();
// Execute the swap
executeDCASwap(
user,
fromToken,
toToken,
swapAmount,
poolKey,
zeroForOne,
customSlippageTolerance
);
// Mark as executed
storage_.markDcaExecuted(user, index);
}
// Helper to prepare execution parameters
function _prepareExecutionParameters(
address user,
uint256 index,
int24 currentTick
) internal view returns (
address fromToken,
address toToken,
uint256 amount,
bool executed,
bool zeroForOne,
uint256 swapAmount,
uint256 customSlippageTolerance
) {
// Get execution details from storage
int24 executionTick;
uint256 deadline;
(
fromToken,
toToken,
amount,
executionTick,
deadline,
executed,
customSlippageTolerance
) = storage_.getDcaQueueItem(user, index);
// Determine direction
zeroForOne = fromToken < toToken;
// Calculate swap amount considering dynamic sizing
swapAmount = _calculateSwapAmount(user, amount, executionTick, currentTick,
zeroForOne);
// Validate sufficient balance
uint256 userSavings = storage_.savings(user, fromToken);
if (userSavings < swapAmount) {
revert InsufficientSavings(fromToken, swapAmount, userSavings);
}
return (fromToken, toToken, amount, executed, zeroForOne, swapAmount,
customSlippageTolerance);
}
// Helper to calculate swap amount
function _calculateSwapAmount(
address user,
uint256 baseAmount,
int24 executionTick,
int24 currentTick,
bool zeroForOne
) internal view returns (uint256) {
// Check if using dynamic sizing
bool dynamicSizing;
(,,,,dynamicSizing,) = storage_.getDcaTickStrategy(user);
if (!dynamicSizing) return baseAmount;
return calculateDynamicDCAAmount(
baseAmount,
executionTick,
currentTick,
zeroForOne
);
}
// Execute the actual DCA swap
function executeDCASwap(
address user,
address fromToken,
address toToken,
uint256 amount,
PoolKey memory poolKey,
bool zeroForOne,
uint256 customSlippageTolerance
) public returns (uint256) {
if (amount == 0) revert ZeroAmountSwap();
// Validate balance
_validateBalance(user, fromToken, amount);
// Prepare swap with slippage protection
SwapExecutionParams memory params = _prepareSwapExecution(
user, fromToken, toToken, amount, customSlippageTolerance
);
// Execute the swap
SwapExecutionResult memory result = _executePoolSwap(
poolKey, params, zeroForOne, amount
);
// Check if swap succeeded
if (!result.success) revert SwapExecutionFailed();
// Get minimum amount out
uint256 minAmountOut = params.minAmountOut;
// Check for slippage
if (result.receivedAmount < minAmountOut) {
bool shouldContinue = slippageModule.handleSlippageExceeded(
user,
fromToken,
toToken,
amount,
result.receivedAmount,
minAmountOut
);
if (!shouldContinue) {
revert SlippageToleranceExceeded(result.receivedAmount, minAmountOut);
}
}
// Process the results
_processSwapResults(user, fromToken, toToken, amount, result.receivedAmount);
emit DCAExecuted(user, fromToken, toToken, amount, result.receivedAmount);
return result.receivedAmount;
}
function _prepareSwapExecution(
address user,
address fromToken,
address toToken,
uint256 amount,
uint256 customSlippageTolerance
) internal returns (SwapExecutionParams memory) {
// Approve the pool manager to spend tokens
IERC20(fromToken).approve(address(storage_.poolManager()), amount);
// Get minimum amount out with slippage protection
uint256 minAmountOut = slippageModule.getMinimumAmountOut(
user, fromToken, toToken, amount, customSlippageTolerance
);
return SwapExecutionParams({
amount: amount,
minAmountOut: minAmountOut,
sqrtPriceLimitX96: 0 // Will be set in the executing function
});
}
function _executePoolSwap(
PoolKey memory poolKey,
SwapExecutionParams memory params,
bool zeroForOne,
uint256 amount
) internal returns (SwapExecutionResult memory) {
// Set price limit to ensure reasonable execution
params.sqrtPriceLimitX96 = zeroForOne ?
TickMath.MIN_SQRT_PRICE + 1 :
TickMath.MAX_SQRT_PRICE - 1;
// Prepare swap parameters
IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
zeroForOne: zeroForOne,
amountSpecified: int256(amount),
sqrtPriceLimitX96: params.sqrtPriceLimitX96
});
// Execute the swap
BalanceDelta delta;
try storage_.poolManager().swap(poolKey, swapParams, "") returns (BalanceDelta
_delta) {
delta = _delta;
} catch {
revert SwapExecutionFailed();
}
// Calculate the amount received
uint256 receivedAmount = _calculateReceivedAmount(delta, zeroForOne);
// Check if we received any tokens
bool success = receivedAmount > 0;
if (!success) {
emit SwapExecutionZeroOutput(amount, zeroForOne);
}
return SwapExecutionResult({
receivedAmount: receivedAmount,
success: success
});
}
// Helper to validate balance
function _validateBalance(address user, address fromToken, uint256 amount) internal
view {
uint256 userSavings = storage_.savings(user, fromToken);
if (userSavings < amount) {
revert InsufficientSavings(fromToken, amount, userSavings);
}
}
// Helper to execute swap via pool manager
function _executeSwap(
address user,
address fromToken,
address toToken,
uint256 amount,
PoolKey memory poolKey,
bool zeroForOne,
uint256 customSlippageTolerance
) internal returns (uint256 receivedAmount) {
// Approve pool manager to spend fromToken
IERC20(fromToken).approve(address(storage_.poolManager()), amount);
// Set price limit to ensure the swap executes at a reasonable price
uint160 sqrtPriceLimitX96 = zeroForOne ?
TickMath.MIN_SQRT_PRICE + 1 :
TickMath.MAX_SQRT_PRICE - 1;
// Prepare swap parameters
IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
zeroForOne: zeroForOne,
amountSpecified: int256(amount),
sqrtPriceLimitX96: sqrtPriceLimitX96
});
// Get min amount out with slippage protection
uint256 minAmountOut = slippageModule.getMinimumAmountOut(
user,
fromToken,
toToken,
amount,
customSlippageTolerance
);
// Execute swap
BalanceDelta delta = _performPoolSwap(poolKey, params);
// Calculate received amount based on the swap delta
receivedAmount = _calculateReceivedAmount(delta, zeroForOne);
// Check for slippage
_handleSlippage(user, fromToken, toToken, amount, receivedAmount,
minAmountOut);
return receivedAmount;
}
// Helper to perform pool swap
function _performPoolSwap(PoolKey memory poolKey, IPoolManager.SwapParams memory
params) internal returns (BalanceDelta delta) {
try storage_.poolManager().swap(poolKey, params, "") returns (BalanceDelta
_delta) {
return _delta;
} catch {
revert SwapExecutionFailed();
}
}
// Helper to calculate received amount
function _calculateReceivedAmount(BalanceDelta delta, bool zeroForOne) internal
pure returns (uint256) {
if (zeroForOne) {
return uint256(int256(-delta.amount1()));
} else {
return uint256(int256(-delta.amount0()));
}
}
// Helper to handle slippage check
function _handleSlippage(
address user,
address fromToken,
address toToken,
uint256 amount,
uint256 receivedAmount,
uint256 minAmountOut
) internal {
if (receivedAmount < minAmountOut) {
// Call the handler which will either revert or continue based on user
preference
bool shouldContinue = slippageModule.handleSlippageExceeded(
user,
fromToken,
toToken,
amount,
receivedAmount,
minAmountOut
);
// If shouldContinue is false, revert the transaction
if (!shouldContinue) {
revert SlippageToleranceExceeded(receivedAmount, minAmountOut);
}
}
}
// Helper to process swap results
function _processSwapResults(
address user,
address fromToken,
address toToken,
uint256 amount,
uint256 receivedAmount
) internal {
// Update savings balances
storage_.decreaseSavings(user, fromToken, amount);
// Calculate and transfer fee
uint256 finalReceivedAmount = storage_.calculateAndTransferFee(user, toToken,
receivedAmount);
// Update user's savings with final amount after fee
storage_.increaseSavings(user, toToken, finalReceivedAmount);
// Update ERC-6909 token balances
tokenModule.burnSavingsToken(user, fromToken, amount);
tokenModule.mintSavingsToken(user, toToken, finalReceivedAmount);
// Transfer tokens to user
_transferTokensToUser(user, toToken, finalReceivedAmount);
}
// Helper to transfer tokens to user
function _transferTokensToUser(address user, address token, uint256 amount)
internal {
bool success = false;
bytes memory returnData;
// Use low-level call instead of try-catch with safeTransfer
(success, returnData) = token.call(
abi.encodeWithSelector(IERC20.transfer.selector, user, amount)
);
if (!success) {
emit TransferFailure(user, token, amount, returnData);
revert TokenTransferFailed();
}
}
// Calculate optimal tick for DCA execution
function calculateDCAExecutionTick(
address user,
PoolKey memory poolKey,
int24 currentTick,
bool zeroForOne
) internal view returns (int24) {
// Get the tick delta from the strategy
(int24 tickDelta,,,,,) = storage_.getDcaTickStrategy(user);
// If no strategy, execute at current tick
if (tickDelta == 0) {
return currentTick;
}
// Calculate target tick based on direction
return zeroForOne ? currentTick - tickDelta : currentTick + tickDelta;
}
// Check if a queued DCA should execute based on current tick
function shouldExecuteDCAAtTick(
address user,
SpendSaveStorage.DCAExecution memory dca,
int24 currentTick
) internal view returns (bool) {
if (dca.executed) return false;
// Get strategy parameters
DCAExecutionCriteria memory criteria = _getDCAExecutionCriteria(user, dca);
// If past deadline, execute regardless of tick
if (criteria.tickExpiryTime > 0 && block.timestamp > dca.deadline) {
return true;
}
// Determine if price has improved enough to execute
bool priceImproved = _hasPriceImproved(
dca.fromToken,
dca.toToken,
currentTick,
dca.executionTick,
criteria.minTickImprovement
);
// If we only execute on price improvement, check that condition
if (criteria.onlyImprovePrice) {
return priceImproved;
}
// Otherwise, execute at or past the target tick
return true;
}
// Helper struct to store DCA execution criteria
struct DCAExecutionCriteria {
bool onlyImprovePrice;
int24 minTickImprovement;
uint256 tickExpiryTime;
}
// Helper to get DCA execution criteria
function _getDCAExecutionCriteria(
address user,
SpendSaveStorage.DCAExecution memory dca
) internal view returns (DCAExecutionCriteria memory criteria) {
(,criteria.tickExpiryTime,criteria.onlyImprovePrice,criteria.minTickImprovement,,) =
storage_.getDcaTickStrategy(user);
return criteria;
}
// Helper to check if price has improved
function _hasPriceImproved(
address fromToken,
address toToken,
int24 currentTick,
int24 executionTick,
int24 minTickImprovement
) internal pure returns (bool) {
bool zeroForOne = fromToken < toToken;
bool priceImproved;
if (zeroForOne) {
// For 0->1, price improves when current tick < execution tick
priceImproved = currentTick <= executionTick;
// Check minimum improvement if required
if (minTickImprovement > 0) {
priceImproved = priceImproved && (executionTick - currentTick >=
minTickImprovement);
}
} else {
// For 1->0, price improves when current tick > execution tick
priceImproved = currentTick >= executionTick;
// Check minimum improvement if required
if (minTickImprovement > 0) {
priceImproved = priceImproved && (currentTick - executionTick >=
minTickImprovement);
}
}
return priceImproved;
}
// Calculate DCA amount based on tick movement (for dynamic sizing)
function calculateDynamicDCAAmount(
uint256 baseAmount,
int24 entryTick,
int24 currentTick,
bool zeroForOne
) internal pure returns (uint256) {
// Calculate tick movement and determine multiplier
TickMovement memory movement = _calculateTickMovement(
entryTick, currentTick, zeroForOne
);
if (!movement.isPositive) return baseAmount;
// Apply multiplier with capping
return _applyMultiplier(baseAmount, movement.delta);
}
function _calculateTickMovement(
int24 entryTick,
int24 currentTick,
bool zeroForOne
) internal pure returns (TickMovement memory) {
// If no tick movement, return zero delta
if (entryTick == currentTick) {
return TickMovement({
delta: 0,
isPositive: false
});
}
// Calculate tick delta based on swap direction
int24 delta = zeroForOne ?
(entryTick - currentTick) :
(currentTick - entryTick);
return TickMovement({
delta: delta,
isPositive: delta > 0
});
}
function _applyMultiplier(
uint256 baseAmount,
int24 tickDelta
) internal pure returns (uint256) {
// Convert to uint safely
uint256 multiplier = uint24(tickDelta);
// Cap multiplier at MAX_MULTIPLIER (100)
if (multiplier > MAX_MULTIPLIER) {
multiplier = MAX_MULTIPLIER;
}
// Apply multiplier to base amount
return baseAmount + (baseAmount * multiplier) / 100;
}
}
```