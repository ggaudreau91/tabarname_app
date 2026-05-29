import Foundation
import Capacitor
import SpotifyiOS

// Pont Capacitor → Spotify iOS SDK (App Remote).
//
// L'App Remote TÉLÉCOMMANDE l'app Spotify installée sur l'iPhone — c'est elle
// qui joue réellement le son. Aucune lecture autonome n'est possible (licence
// Spotify). Voir NATIVE_IOS_SETUP.md pour les prérequis (SDK, Info.plist,
// client ID, redirect URI).
//
// Enregistré automatiquement par Capacitor via CAPBridgedPlugin (pas de .m).
@objc(SpotifyRemotePlugin)
public class SpotifyRemotePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpotifyRemotePlugin"
    public let jsName = "SpotifyRemote"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playUri", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
    ]

    // Permet à l'AppDelegate de router le callback OAuth (redirect URI) vers
    // l'instance vivante du plugin.
    static weak var shared: SpotifyRemotePlugin?

    private lazy var appRemote: SPTAppRemote = {
        let remote = SPTAppRemote(configuration: configuration, logLevel: .info)
        remote.delegate = self
        return remote
    }()

    // Client ID + redirect URI lus depuis Info.plist (SpotifyClientID /
    // SpotifyRedirectURL) — voir NATIVE_IOS_SETUP.md.
    private lazy var configuration: SPTConfiguration = {
        let clientID = (Bundle.main.object(forInfoDictionaryKey: "SpotifyClientID") as? String) ?? ""
        let redirect = (Bundle.main.object(forInfoDictionaryKey: "SpotifyRedirectURL") as? String) ?? ""
        return SPTConfiguration(clientID: clientID, redirectURL: URL(string: redirect)!)
    }()

    private var pendingConnectCall: CAPPluginCall?
    private var lastPlayerState: SPTAppRemotePlayerState?

    public override func load() {
        SpotifyRemotePlugin.shared = self
    }

    // MARK: - Méthodes exposées au JS

    @objc func connect(_ call: CAPPluginCall) {
        guard let token = call.getString("token"), !token.isEmpty else {
            call.reject("token manquant")
            return
        }
        DispatchQueue.main.async {
            self.appRemote.connectionParameters.accessToken = token
            self.pendingConnectCall = call
            // Si l'app Spotify tourne déjà, connect() suffit. Sinon le SDK
            // déclenche didFailConnectionAttempt → on réveille Spotify via
            // authorizeAndPlayURI (voir delegate ci-dessous).
            self.appRemote.connect()
        }
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.appRemote.isConnected {
                self.appRemote.disconnect()
            }
            call.resolve()
        }
    }

    @objc func playUri(_ call: CAPPluginCall) {
        guard let uri = call.getString("uri") else {
            call.reject("uri manquant")
            return
        }
        runPlayer(call) { player in
            player.play(uri) { _, error in
                if let error = error { call.reject(error.localizedDescription) }
                else { call.resolve() }
            }
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        runPlayer(call) { player in
            player.pause { _, error in
                if let error = error { call.reject(error.localizedDescription) }
                else { call.resolve() }
            }
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        runPlayer(call) { player in
            player.resume { _, error in
                if let error = error { call.reject(error.localizedDescription) }
                else { call.resolve() }
            }
        }
    }

    @objc func getState(_ call: CAPPluginCall) {
        if let state = lastPlayerState {
            call.resolve(SpotifyRemotePlugin.serialize(state))
        } else {
            call.resolve(["isPaused": true, "trackUri": NSNull(), "positionMs": 0])
        }
    }

    // MARK: - Helpers

    private func runPlayer(_ call: CAPPluginCall, _ body: @escaping (SPTAppRemotePlayerAPI) -> Void) {
        DispatchQueue.main.async {
            guard self.appRemote.isConnected, let player = self.appRemote.playerAPI else {
                call.reject("App Remote non connecté")
                return
            }
            body(player)
        }
    }

    fileprivate static func serialize(_ state: SPTAppRemotePlayerState) -> [String: Any] {
        return [
            "isPaused": state.isPaused,
            "trackUri": state.track.uri,
            "positionMs": Int(state.playbackPosition),
        ]
    }

    // Appelé par l'AppDelegate sur retour du redirect URI.
    func handleOpenURL(_ url: URL) {
        let params = appRemote.authorizationParameters(from: url)
        if let token = params?[SPTAppRemoteAccessTokenKey] {
            appRemote.connectionParameters.accessToken = token
            appRemote.connect()
        } else if let error = params?[SPTAppRemoteErrorDescriptionKey] {
            pendingConnectCall?.reject(error)
            pendingConnectCall = nil
        }
    }
}

// MARK: - SPTAppRemoteDelegate

extension SpotifyRemotePlugin: SPTAppRemoteDelegate {
    public func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
        appRemote.playerAPI?.delegate = self
        appRemote.playerAPI?.subscribe(toPlayerState: { _, _ in })
        notifyListeners("connected", data: [:])
        pendingConnectCall?.resolve(["connected": true])
        pendingConnectCall = nil
    }

    public func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) {
        // Spotify n'est probablement pas lancé → on le réveille + autorise.
        // authorizeAndPlayURI("") lance Spotify; le token revient via le
        // redirect URI (handleOpenURL).
        if appRemote.authorizeAndPlayURI("") == false {
            // Spotify n'est pas installé.
            notifyListeners("disconnected", data: ["error": "Spotify n'est pas installé"])
            pendingConnectCall?.reject(error?.localizedDescription ?? "Spotify n'est pas installé")
            pendingConnectCall = nil
        }
    }

    public func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) {
        notifyListeners("disconnected", data: ["error": error?.localizedDescription ?? ""])
    }
}

// MARK: - SPTAppRemotePlayerStateDelegate

extension SpotifyRemotePlugin: SPTAppRemotePlayerStateDelegate {
    public func playerStateDidChange(_ playerState: SPTAppRemotePlayerState) {
        lastPlayerState = playerState
        notifyListeners("stateChanged", data: SpotifyRemotePlugin.serialize(playerState))
    }
}
