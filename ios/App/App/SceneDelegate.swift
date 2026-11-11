import UIKit
import Capacitor

// Cycle de vie UIScene — obligatoire depuis le SDK iOS 27 : sans manifeste de
// scène, UIKit fait planter l'app au lancement (trappe
// « NoSceneLifecycleAdoption »). La fenêtre et le MainViewController viennent
// du storyboard Main via UISceneStoryboardFile; ce délégué ne fait que router
// les URL (callback Spotify) et les Universal Links, qui n'arrivent PLUS à
// l'AppDelegate une fois les scènes adoptées.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        // Fenêtre et vue racine instanciées par UIKit depuis le storyboard.
        // On traite tout de même une URL d'ouverture à froid (app lancée par
        // le callback Spotify alors qu'elle était fermée).
        if let context = connectionOptions.urlContexts.first {
            handle(url: context.url, options: context.options)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let context = URLContexts.first else { return }
        handle(url: context.url, options: context.options)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        // Universal Links → suivi par le plugin App de Capacitor.
        ApplicationDelegateProxy.shared.application(UIApplication.shared,
                                                    continue: userActivity) { _ in }
    }

    private func handle(url: URL, options: UIScene.OpenURLOptions) {
        var legacyOptions: [UIApplication.OpenURLOptionsKey: Any] = [
            UIApplication.OpenURLOptionsKey.openInPlace: options.openInPlace,
        ]
        if let annotation = options.annotation {
            legacyOptions[.annotation] = annotation
        }
        if let app = options.sourceApplication {
            legacyOptions[.sourceApplication] = app
        }
        SpotifyRemotePlugin.shared?.handleOpenURL(UIApplication.shared, url, legacyOptions)
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared,
                                                        open: url, options: legacyOptions)
    }
}
