package com.apinacio.healthmate

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.widget.TextView
import android.widget.LinearLayout
import android.graphics.Color
import android.view.Gravity

class PermissionsRationaleActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 🔥 CRIAR LAYOUT DINÂMICO PARA MOSTRAR POLÍTICA DE PRIVACIDADE
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
            setBackgroundColor(Color.WHITE)
        }
        
        val titleText = TextView(this).apply {
            text = "HealthMate - Política de Privacidade"
            textSize = 20f
            setTextColor(Color.BLACK)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        }
        
        val bodyText = TextView(this).apply {
            text = """
O HealthMate solicita acesso aos seus dados de saúde através do Health Connect para:

• Monitorar passos e atividades físicas
• Acompanhar frequência cardíaca
• Controlar peso e composição corporal
• Gerenciar sono e hidratação
• Auxiliar no controle de medicações

Seus dados são:
✓ Armazenados localmente no Health Connect
✓ Nunca compartilhados sem sua permissão
✓ Protegidos por criptografia
✓ Controlados inteiramente por você

Você pode revogar essas permissões a qualquer momento nas configurações do Health Connect.

Para mais informações, consulte nossa política de privacidade completa em nosso aplicativo.
            """.trimIndent()
            textSize = 14f
            setTextColor(Color.DKGRAY)
            setLineSpacing(1.2f, 1.2f)
        }
        
        layout.addView(titleText)
        layout.addView(bodyText)
        setContentView(layout)
        
        // 🔥 DEFINIR TÍTULO DA ACTIVITY
        title = "Permissões do HealthMate"
    }
} 