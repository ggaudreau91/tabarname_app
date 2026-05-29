import UIKit
import Capacitor

// Capacitor n'auto-découvre QUE les plugins livrés en packages npm. Un plugin
// défini localement dans l'app (SpotifyRemotePlugin) doit être enregistré
// explicitement ici, sinon le JS reçoit "plugin is not implemented on ios".
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        NSLog("⚡️ [Tabarname] capacitorDidLoad — enregistrement de SpotifyRemote (bridge=\(bridge != nil))")
        bridge?.registerPluginInstance(SpotifyRemotePlugin())
    }
}
