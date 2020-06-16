// State object
import {
    AssetBalance,
    ErrorContext, ExportAvaPChain, ImportAvaPChain,
    PAddressExport,
    PAddressImport,
    PChainAccount, UpdateAssetBalance,
    User,
    XAddressExport,
    XAddressImport,
    XChainAddress
} from "@/types";
import {bootstrapNodeApi, nodeApi} from "@/AVA";
import {Actions, createMapper, Getters, Module, Mutations} from "vuex-smart-module";
import jdenticon from 'jdenticon';
import BN from 'bn.js';

class AccountState {
    xAddressPKey = "";
    xAddresses: XChainAddress[] = [];
    txId: string[] = [];
    txStatus = "";
    pAccounts: PChainAccount[] = [];
    loading = new Map();
    error = new Map()
}

class AccountGetters extends Getters<AccountState> {
    get getXAddresses() {
        return this.state.xAddresses;
    }

    get getPAccounts() {
        return this.state.pAccounts;
    }
}

class AccountMutations extends Mutations<AccountState> {

    setPAccounts(pAccounts: PChainAccount[]) {
        this.state.pAccounts = pAccounts;
    }

    setXaddressPKey(xAddressPKey: string) {
        this.state.xAddressPKey = xAddressPKey;
    }

    setXAddress(xChain: XChainAddress[]) {
        this.state.xAddresses = xChain;
    }

    pushTxId(txId: string) {
        this.state.txId.push(txId)
    }

    setTxStatus(txStatus: string) {
        this.state.txStatus = txStatus
    }

    pushAddress(address: XChainAddress) {
        this.state.xAddresses.push(address)
    }

    pushPAccount(account: PChainAccount) {
        this.state.pAccounts.push(account)
    }

    setPAccountPKey(update: { pKey: string, address: string }) {
        const toUpdate = this.state.pAccounts.find((i: PChainAccount) => i.address === update.address)
        if (toUpdate)
            toUpdate.privateKey = update.pKey
    }

    setXAddressBalance(update: UpdateAssetBalance) {
        const toUpdate = this.state.xAddresses.find((i: XChainAddress) => i.address === update.address)
        if (toUpdate)
            toUpdate.assets = update.balances
    }

    setLoading(key: string) {
        this.state.loading.set(key, true)
    }

    setLoaded(key: string) {
        this.state.loading.set(key, false);
    }

    setError(errorContext: ErrorContext) {
        this.state.error.set(errorContext.key, errorContext.error)
    }
}

class AccountActions extends Actions<AccountState,
    AccountGetters,
    AccountMutations,
    Actions> {


    async listXAddresses(user: User) {
        const api = nodeApi;
        this.mutations.setLoading('listXAddresses');
        if (!user.name || !user.password) {
            this.mutations.setLoaded('listXAddresses');
            this.mutations.setError({key: 'listXAddresses', error: new Error('Missing params')})
            return false;
        }
        try {
            const addresses = await api.AVM().listAddresses(user.name, user.password);
            const xAddresses = addresses.map(a => {
                return {
                    address: a,
                    identicon: jdenticon.toSvg(a, 60),
                    assets: [{
                        asset: "",
                        balance: -1
                    } as AssetBalance]
                } as XChainAddress
            })
            this.mutations.setXAddress(xAddresses)
            addresses.map(async a => {
                await this.getBalances(a)
            })
            this.mutations.setLoaded('listXAddresses')
        } catch (e) {
            this.mutations.setLoaded('listXAddresses');
            this.mutations.setError({key: 'listXAddresses', error: e})
        }
    }

    async listPAccounts(user: User) {
        const api = nodeApi;
        this.mutations.setLoading('listPAccounts');
        if (!user.name || !user.password) {
            this.mutations.setLoaded('listPAccounts');
            this.mutations.setError({key: 'listPAccounts', error: new Error('Missing params')})
            return false;
        }
        try {
            const accounts = await api.Platform().listAccounts(user.name, user.password) as PChainAccount[];
            accounts.forEach(account => {
                account.identicon = jdenticon.toSvg(account.address, 60)
            })
            this.mutations.setPAccounts(accounts)
            this.mutations.setLoaded('listPAccounts')
        } catch (e) {
            this.mutations.setLoaded('listPAccounts');
            this.mutations.setError({key: 'listPAccounts', error: e})
        }
    }

    async exportAvaToPChain(data: ExportAvaPChain) {
        const api = nodeApi;
        console.log(JSON.stringify(data))
        this.mutations.setLoading('exportAvaToPChain');
        if (!data.username || !data.password || !data.to || data.amount < 0) {
            this.mutations.setLoaded('exportAvaToPChain');
            this.mutations.setError({key: 'exportAvaToPChain', error: new Error('Missing params')})
            return false;
        }
        try {
            const txId = await api.AVM().exportAVA(data.username, data.password, data.to, new BN(data.amount));
            this.mutations.pushTxId(txId)
            this.mutations.setLoaded('exportAvaToPChain')
            return true
        } catch (e) {
            this.mutations.setLoaded('exportAvaToPChain');
            this.mutations.setError({key: 'exportAvaToPChain', error: e})
            return false
        }
    }

    async importAvaFromXChain(data: ImportAvaPChain) {
        const api = nodeApi;
        this.mutations.setLoading('importAvaFromXChain');
        if (!data.username || !data.password || !data.to || data.nonce <= 0) {
            this.mutations.setLoaded('importAvaFromXChain');
            this.mutations.setError({key: 'importAvaFromXChain', error: new Error('Missing params')})
            return false;
        }
        try {
            const rawTx = await api.Platform().importAVA(data.username, data.password, data.to, data.nonce)
            const txId = await api.Platform().issueTx(rawTx);
            this.mutations.pushTxId(txId)
            this.mutations.setLoaded('importAvaFromXChain')
            return true
        } catch (e) {
            this.mutations.setLoaded('importAvaFromXChain');
            this.mutations.setError({key: 'importAvaFromXChain', error: e})
            return false
        }
    }

    async checkTxStatus(payload: { txId: string, timeout: NodeJS.Timeout }) {
        const avmApi = await nodeApi.AVM()
        this.mutations.setLoading('checkTxStatus')

        try {
            const txStatus = await avmApi.getTxStatus(payload.txId);
            this.mutations.setTxStatus(txStatus)
            if (txStatus.toUpperCase() === 'ACCEPTED') {
                clearInterval(payload.timeout)
            }
            this.mutations.setLoaded('checkTxStatus')
        } catch (e) {
            this.mutations.setTxStatus("INVALID")
            this.mutations.setLoaded('checkTxStatus')
            this.mutations.setError({key: 'checkTxStatus', error: e})
        }
    }

    async getBalances(address: string) {
        const api = nodeApi
        let updateBalances: AssetBalance[] = []
        this.mutations.setLoading('getBalances');
        try {
            const balances = await api.AVM().getAllBalances(address) as AssetBalance[]
            if (balances.length > 0) {
                updateBalances = balances.map((balance: AssetBalance) => {
                    return {
                        balance: balance.balance,
                        asset: balance.asset,
                    } as AssetBalance
                })
            } else {
                updateBalances = [{
                    balance: 0,
                    asset: "AVA"
                }] as AssetBalance[]
            }

            this.mutations.setXAddressBalance({address, balances: updateBalances} as UpdateAssetBalance)
            this.mutations.setLoaded('getBalances');
        } catch (e) {
            this.mutations.setLoaded('getBalances');
            this.mutations.setError({key: 'getBalances', error: e})
        }
    }

    async createXAddresse(user: User) {
        const api = nodeApi;
        this.mutations.setLoading('createXAddresse');
        if (!user.name || !user.password) {
            this.mutations.setLoaded('createXAddresse');
            this.mutations.setError({key: 'createXAddresse', error: new Error('Missing params')})
            return false;
        }
        try {
            const address = await api.AVM().createAddress(user.name, user.password)
            const xChainAddress = {
                address,
                identicon: jdenticon.toSvg(address, 60),
                assets: [{
                    asset: "",
                    balance: -1
                } as AssetBalance]
            } as XChainAddress

            await this.getBalances(address)

            this.mutations.pushAddress(xChainAddress)
            this.mutations.setLoaded('createXAddresse');
        } catch (e) {
            this.mutations.setLoaded('createXAddresse');
            this.mutations.setError({key: 'createXAddresse', error: e})
        }
    }

    async importXAddress(user: XAddressImport) {
        const api = nodeApi;
        this.mutations.setLoading('importXAddress');
        if (!user.name || !user.password || !user.privateKey) {
            this.mutations.setLoaded('importXAddress');
            this.mutations.setError({key: 'importXAddress', error: new Error('Missing params')})
            return false;
        }
        try {
            const address = await api.AVM().importKey(user.name, user.password, user.privateKey)
            const xChainAddress = {
                address,
                identicon: jdenticon.toSvg(address, 60),
                assets: [{
                    asset: "",
                    balance: -1
                } as AssetBalance]
            } as XChainAddress
            await this.getBalances(address)
            this.dispatch
            this.mutations.pushAddress(xChainAddress)
            this.mutations.setLoaded('importXAddress');
        } catch (e) {
            this.mutations.setLoaded('importXAddress');
            this.mutations.setError({key: 'importXAddress', error: e})
        }
    }

    async exportXAddress(user: XAddressExport) {
        const api = nodeApi;
        this.mutations.setLoading('exportXAddress');
        if (!user.name || !user.password || !user.address) {
            this.mutations.setLoaded('exportXAddress');
            this.mutations.setError({key: 'exportXAddress', error: new Error('Missing params')})
            return "";
        }
        try {
            const pKey = await api.AVM().exportKey(user.name, user.password, user.address)
            this.mutations.setXaddressPKey(pKey)
            this.mutations.setLoaded('exportXAddress');
            return pKey;
        } catch (e) {
            this.mutations.setLoaded('exportXAddress');
            this.mutations.setError({key: 'exportXAddress', error: e})
        }
    }

    async createPAccount(user: User) {
        const api = nodeApi;
        this.mutations.setLoading('createPAccount');
        if (!user.name || !user.password) {
            this.mutations.setLoaded('createPAccount');
            this.mutations.setError({key: 'createPAccount', error: new Error('Missing params')})
            return false;
        }
        try {
            const pAddress = await api.Platform().createAccount(user.name, user.password)
            const pAccount = await api.Platform().getAccount(pAddress) as PChainAccount
            pAccount.identicon = jdenticon.toSvg(pAccount.address, 60)
            this.mutations.pushPAccount(pAccount)
            this.mutations.setLoaded('createPAccount');
        } catch (e) {
            this.mutations.setLoaded('createPAccount');
            this.mutations.setError({key: 'createPAccount', error: e})
        }
    }

    async exportPAccountKey(user: PAddressExport) {
        const api = nodeApi;
        this.mutations.setLoading('exportPAccountKey');
        if (!user.name || !user.password || !user.address) {
            this.mutations.setLoaded('exportPAccountKey');
            this.mutations.setError({key: 'exportPAccountKey', error: new Error('Missing params')})
            return "";
        }
        try {
            const pAccountKey = await api.Platform().exportKey(user.name, user.password, user.address);
            this.mutations.setPAccountPKey({pKey: pAccountKey, address: user.address})
            this.mutations.setLoaded('exportPAccountKey');
            return pAccountKey
        } catch (e) {
            this.mutations.setLoaded('exportPAccountKey');
            this.mutations.setError({key: 'exportPAccountKey', error: e})
        }
    }

    async importPAccountKey(user: PAddressImport) {
        const api = nodeApi;
        this.mutations.setLoading('importPAccountKey');
        if (!user.name || !user.password || !user.privateKey) {
            this.mutations.setLoaded('importPAccountKey');
            this.mutations.setError({key: 'importPAccountKey', error: new Error('Missing params')})
            return false;
        }
        try {
            const pAddress = await api.Platform().importKey(user.name, user.password, user.privateKey);
            const pAccount = await api.Platform().getAccount(pAddress) as PChainAccount
            pAccount.identicon = jdenticon.toSvg(pAccount.address, 60)
            this.mutations.pushPAccount(pAccount)
            this.mutations.setLoaded('importPAccountKey');
        } catch (e) {
            this.mutations.setLoaded('importPAccountKey');
            this.mutations.setError({key: 'importPAccountKey', error: e})
        }
    }
}

export const Account = new Module({
    state: AccountState,
    getters: AccountGetters,
    mutations: AccountMutations,
    actions: AccountActions
})

export const AccountMapper = createMapper(Account)
