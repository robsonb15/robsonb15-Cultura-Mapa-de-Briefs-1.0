import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { Eye, EyeOff, ChevronLeft, Check, HelpCircle, Info, LogIn, Mail } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type AuthStep = 'login' | 'register_account' | 'register_terms' | 'register_profile' | 'success' | 'forgot_password';

export default function AuthPage({ onBack }: { onBack?: () => void }) {
  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [miniBio, setMiniBio] = useState('');
  const [areas, setAreas] = useState<string>('');
  const [isHuman, setIsHuman] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [iframeWarning, setIframeWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState({
    terms: false,
    privacy: false,
    image: false
  });

  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setError('');
    setIframeWarning(false);
    setLoading(true);
    try {
      await loginWithGoogle();
      if (onBack) onBack();
    } catch (err: any) {
      console.error('Google login error captured:', err);
      const errStr = String(err);
      const isIframeErr = err.code === 'auth/cancelled-popup-request' || 
                          err.code === 'auth/internal-error' || 
                          errStr.includes('Pending promise') || 
                          errStr.includes('cancelled-popup-request') ||
                          errStr.includes('internal-error') ||
                          window.self !== window.top;

      if (isIframeErr) {
        setIframeWarning(true);
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(
          'Domínio Não Autorizado: Por favor, adicione o domínio atual aos "Domínios Autorizados" nas configurações do Firebase Authentication no seu Console do Firebase.'
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('O login foi cancelado porque a janela de autenticação do Google foi fechada.');
      } else {
        setError('Erro ao entrar com Google: ' + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculation
  const [passwordStrength, setPasswordStrength] = useState(0);
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 6) score += 20;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[a-z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 20;
    if (/[^A-Za-z0-9]/.test(pass)) score += 20;
    setPasswordStrength(score);
  };

  useEffect(() => {
    calculateStrength(password);
  }, [password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      if (onBack) onBack();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Ocorreu um erro ao entrar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('Nenhum usuário cadastrado com este e-mail.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        setError('Ocorreu um erro ao solicitar redefinição de senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (passwordStrength < 60) {
      setError('Sua senha não é forte o suficiente.');
      return;
    }
    if (!isHuman) {
      setError('Por favor, confirme que você não é um robô.');
      return;
    }
    setError('');
    setStep('register_terms');
  };

  const handleFinalRegister = async () => {
    if (fullName.trim().length < 3) {
      setError('O nome completo deve conter pelo menos 3 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        uid: user.uid,
        fullName,
        cpf,
        privateEmail: email.trim(),
        miniBio,
        areas: areas.split(',').map(a => a.trim()).filter(a => a !== ''),
        acceptedTerms,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setStep('success');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/weak-password') {
        setError('Senha muito fraca para o sistema.');
      } else {
        setError('Ocorreu um erro ao criar sua conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const RegistrationProgress = ({ current }: { current: number }) => (
    <div className="flex items-center justify-between max-w-[280px] mx-auto mb-10">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className={`w-3 h-3 rounded-full transition-all duration-500 ${current >= s ? 'bg-red-600 scale-125' : 'bg-stone-200'}`} />
          {s < 5 && <div className={`flex-1 h-[1px] mx-2 ${current > s ? 'bg-red-600' : 'bg-stone-200'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center p-4 py-4 sm:py-8">
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-[460px] w-full bg-white rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 md:p-8"
      >
        <AnimatePresence mode="wait">
          {/* LOGIN VIEW */}
          {step === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">Entrar usuários</h1>
                <p className="text-stone-500 text-xs sm:text-sm">Acesse sua conta no Mapa Cultural</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-900">E-mail</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-stone-200 rounded-lg p-3 sm:p-3.5 text-sm outline-none focus:border-[#0070BA] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-stone-900">Senha</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setError('');
                        setForgotEmail(email);
                        setForgotSuccess(false);
                        setStep('forgot_password');
                      }}
                      className="text-[#0070BA] text-xs font-bold hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-stone-200 rounded-lg p-3 sm:p-3.5 text-sm outline-none focus:border-[#0070BA] transition-colors pr-12"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 p-3 rounded-lg space-y-1.5">
                    <p className="text-red-500 text-xs font-bold">{error}</p>
                    {error.includes('em uso') && (
                      <button 
                        type="button"
                        onClick={() => setStep('login')}
                        className="text-[#0070BA] text-[10px] font-black uppercase tracking-tight hover:underline flex items-center gap-1"
                      >
                        <LogIn size={12} /> Ir para Login
                      </button>
                    )}
                  </div>
                )}

                {iframeWarning && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2 text-stone-800 text-sm">
                    <div className="flex gap-2 items-start text-amber-600 font-extrabold uppercase text-xs tracking-tight">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <span>Restrição de Navegador (IFrame)</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Os navegadores modernos bloqueiam pop-ups do Google dentro de iframes por segurança contra rastreamento.
                    </p>
                    <div className="bg-white/60 p-2.5 rounded-lg space-y-1 text-[11px] border border-amber-100">
                      <p className="font-bold text-stone-700">Como resolver:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-stone-600">
                        <li><strong>Abrir em nova aba:</strong> Clique no ícone de "Abrir em nova aba" no topo direito do AI Studio.</li>
                        <li><strong>E-mail e Senha:</strong> Crie uma conta com e-mail e senha no botão abaixo.</li>
                      </ul>
                    </div>
                  </div>
                )}

                <button 
                  disabled={loading}
                  className="w-full bg-[#0070BA] text-white py-3 sm:py-3.5 rounded-lg font-bold text-sm hover:bg-[#005ea6] transition-all disabled:opacity-50"
                >
                  {loading ? 'Carregando...' : 'Entrar'}
                </button>
              </form>

              <div className="flex items-center gap-3 text-stone-300 py-1">
                <div className="h-[1px] flex-1 bg-current" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Ou</span>
                <div className="h-[1px] flex-1 bg-current" />
              </div>

              <button 
                onClick={handleGoogleLogin}
                className="w-full border border-stone-200 py-3 sm:py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-3 hover:bg-stone-50 transition-colors"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
                Entrar com Google
              </button>

              <div className="pt-4 border-t border-stone-100 text-center space-y-3">
                <p className="text-xs sm:text-sm text-stone-500">Ainda não tem cadastro?</p>
                <button 
                  onClick={() => setStep('register_account')}
                  className="w-full bg-[#0070BA] text-white py-3 sm:py-3.5 rounded-lg font-bold text-sm hover:bg-[#005ea6] transition-all"
                >
                  Fazer cadastro
                </button>
              </div>
            </motion.div>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {step === 'forgot_password' && (
            <motion.div
              key="forgot_password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-3xl font-bold text-stone-900 mb-2">Recuperar Senha</h1>
                <p className="text-stone-500 text-sm">Insira o e-mail cadastrado para receber as instruções de recuperação.</p>
              </div>

              {forgotSuccess ? (
                <div className="bg-green-50 p-6 rounded-2xl text-center space-y-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Check size={24} />
                  </div>
                  <p className="text-sm font-bold text-stone-800">Link enviado com sucesso!</p>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Um link de redefinição de senha foi enviado para <span className="font-bold">{forgotEmail}</span>. Verifique também sua caixa de spam se não encontrar o e-mail.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('login');
                      setError('');
                    }}
                    className="w-full bg-[#0070BA] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#005ea6] transition-all"
                  >
                    Voltar para o Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-900">E-mail</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="seu-email@exemplo.com"
                        className="w-full border border-stone-200 rounded-lg p-4 text-sm outline-none focus:border-[#0070BA] transition-colors pl-12"
                        required
                      />
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-red-500 text-xs font-bold">{error}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0070BA] text-white py-4 rounded-lg font-bold text-sm hover:bg-[#005ea6] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      setStep('login');
                      setError('');
                    }}
                    className="w-full text-stone-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-stone-900 transition-colors"
                  >
                    <ChevronLeft size={16} /> Voltar para o Login
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* REGISTER STEP 1: ACCOUNT */}
          {step === 'register_account' && (
            <motion.div
              key="reg1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-3xl font-bold text-stone-900 mb-2">Novo cadastro</h1>
                <p className="text-stone-500 text-sm">Siga os passos para criar o seu cadastro no Mapa cultural.</p>
              </div>

              <RegistrationProgress current={1} />

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-900">E-mail</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-stone-200 rounded-lg p-4 text-sm outline-none focus:border-[#0070BA] transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-stone-900">CPF</label>
                    <button className="flex items-center gap-1 text-[10px] text-stone-900 font-bold hover:underline">
                      Por que pedimos este dado <HelpCircle size={14} />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full border border-stone-200 rounded-lg p-4 text-sm outline-none focus:border-[#0070BA] transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-900">Senha</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-stone-200 rounded-lg p-4 text-sm outline-none focus:border-[#0070BA] transition-colors pr-12"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-900">Confirme sua senha</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border border-stone-200 rounded-lg p-4 text-sm outline-none focus:border-[#0070BA] transition-colors pr-12"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-stone-900">Força da senha</span>
                    <span className="text-stone-400">{passwordStrength}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full transition-all duration-500 ${
                        passwordStrength < 40 ? 'bg-red-500' : 
                        passwordStrength < 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                    A senha deve conter: <span className={password.length >= 6 ? 'text-green-600' : 'text-red-700'}>6 caracteres</span>, 
                    <span className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-red-700'}> pelo menos uma letra maiúscula</span>, 
                    <span className={/[a-z]/.test(password) ? 'text-green-600' : 'text-red-700'}> uma letra minúscula</span>, 
                    <span className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-red-700'}> um caracter especial</span>, 
                    <span className={/[0-9]/.test(password) ? 'text-green-600' : 'text-red-700'}> um número</span>.
                  </p>
                </div>

                {/* Recaptcha */}
                <div 
                  onClick={() => setIsHuman(!isHuman)}
                  className="bg-stone-50 border border-stone-100 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-stone-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all ${isHuman ? 'bg-green-500 border-green-500' : 'bg-white border-stone-300'}`}>
                      {isHuman && <Check className="text-white" size={16} />}
                    </div>
                    <span className="text-xs font-bold text-stone-600">Não sou um robô</span>
                  </div>
                  <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" className="h-8 grayscale opacity-50" alt="" />
                </div>

                {error && (
                  <div className="bg-red-50 p-4 rounded-lg space-y-2 mt-4">
                    <p className="text-red-500 text-[11px] font-bold">{error}</p>
                    {error.includes('em uso') && (
                      <button 
                        type="button"
                        onClick={() => setStep('login')}
                        className="text-[#0070BA] text-[10px] font-black uppercase tracking-tight hover:underline flex items-center gap-1"
                      >
                        <LogIn size={12} /> Entrar com esta conta
                      </button>
                    )}
                  </div>
                )}

                <button 
                  onClick={handleCreateAccount}
                  className="w-full bg-[#0070BA] text-white py-4 rounded-lg font-bold text-sm hover:bg-[#005ea6] transition-all"
                >
                  Continuar
                </button>

                <button 
                  onClick={handleGoogleLogin}
                  className="w-full border border-stone-200 py-4 rounded-lg font-bold text-sm flex items-center justify-center gap-3 hover:bg-stone-50 transition-colors"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
                  Entrar com Google
                </button>

                <button 
                  onClick={() => setStep('login')}
                  className="w-full text-stone-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-stone-900 transition-colors"
                >
                  <ChevronLeft size={16} /> Já tenho uma conta
                </button>
              </div>
            </motion.div>
          )}

          {/* REGISTER STEP 2: TERMS */}
          {step === 'register_terms' && (
            <motion.div
              key="terms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-3xl font-bold text-stone-900 mb-2">Termos e Condições</h1>
                <p className="text-stone-500 text-sm">Leia e aceite os termos para continuar.</p>
              </div>

              <RegistrationProgress current={2} />

              <div className="space-y-6">
                {[
                  { key: 'terms', label: 'Aceito os Termos de Uso' },
                  { key: 'privacy', label: 'Aceito a Política de Privacidade' },
                  { key: 'image', label: 'Aceito a Autorização de Uso de Imagem' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors group">
                    <input 
                      type="checkbox"
                      checked={acceptedTerms[item.key as keyof typeof acceptedTerms]}
                      onChange={(e) => setAcceptedTerms({...acceptedTerms, [item.key]: e.target.checked})}
                      className="w-5 h-5 rounded border-stone-300 text-[#0070BA] focus:ring-[#0070BA]"
                    />
                    <span className="text-sm font-bold text-stone-700 group-hover:text-[#0070BA] transition-colors">{item.label}</span>
                  </label>
                ))}

                <button 
                  disabled={!acceptedTerms.terms || !acceptedTerms.privacy || !acceptedTerms.image}
                  onClick={() => setStep('register_profile')}
                  className="w-full bg-[#0070BA] text-white py-4 rounded-lg font-bold text-sm hover:bg-[#005ea6] transition-all disabled:opacity-50"
                >
                  Continuar
                </button>

                <button 
                  onClick={() => setStep('register_account')}
                  className="w-full text-stone-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-stone-900 transition-colors"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
              </div>
            </motion.div>
          )}

          {/* REGISTER STEP 3: PROFILE */}
          {step === 'register_profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-3xl font-bold text-stone-900 mb-2">Seu Perfil</h1>
                <p className="text-stone-500 text-sm">Fale um pouco sobre você para a comunidade.</p>
              </div>

              <RegistrationProgress current={3} />

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-900">Nome Completo</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Como deseja ser chamado"
                    className="w-full border border-stone-200 rounded-lg p-4 text-sm outline-none focus:border-[#0070BA] transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-stone-900">Mini Bio</label>
                    <span className="text-[10px] text-stone-400">{miniBio.length}/400</span>
                  </div>
                  <textarea 
                    value={miniBio}
                    onChange={(e) => setMiniBio(e.target.value.slice(0, 400))}
                    placeholder="Conte sua trajetória em poucas palavras..."
                    rows={4}
                    className="w-full border border-stone-200 rounded-lg p-4 text-sm outline-none focus:border-[#0070BA] transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-900">Áreas de Atuação</label>
                  <input 
                    type="text" 
                    value={areas}
                    onChange={(e) => setAreas(e.target.value)}
                    placeholder="Ex: Música, Teatro, Artesanato..."
                    className="w-full border border-stone-200 rounded-lg p-4 text-sm outline-none focus:border-[#0070BA] transition-colors"
                  />
                  <p className="text-[10px] text-stone-400 font-medium">Separe as áreas por vírgula.</p>
                </div>

                {error && (
                  <div className="bg-red-50 p-4 rounded-lg space-y-2 mt-4">
                    <p className="text-red-500 text-[11px] font-bold">{error}</p>
                    {error.includes('em uso') && (
                      <button 
                        type="button"
                        onClick={() => setStep('login')}
                        className="text-[#0070BA] text-[10px] font-black uppercase tracking-tight hover:underline flex items-center gap-1"
                      >
                        <LogIn size={12} /> Entrar com esta conta
                      </button>
                    )}
                  </div>
                )}

                <button 
                  disabled={loading || fullName.trim().length < 3}
                  onClick={handleFinalRegister}
                  className="w-full bg-[#0070BA] text-white py-4 rounded-lg font-bold text-sm hover:bg-[#005ea6] transition-all disabled:opacity-50"
                >
                  {loading ? 'Finalizando...' : 'Criar cadastro'}
                </button>

                <button 
                  onClick={() => setStep('register_terms')}
                  className="w-full text-stone-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-stone-900 transition-colors"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
              </div>
            </motion.div>
          )}

          {/* SUCCESS VIEW */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} />
              </div>
              <h1 className="text-3xl font-bold text-stone-900">Cadastro Realizado!</h1>
              <p className="text-stone-500 text-sm">
                Pronto! Agora você faz parte da nossa comunidade e está preparado para iniciar a sua jornada no Mapa Cultural!
              </p>
              <button 
                onClick={onBack}
                className="w-full bg-[#0070BA] text-white py-4 rounded-lg font-bold text-sm hover:bg-[#005ea6] transition-all"
              >
                Começar a usar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Footer */}
        <div className="mt-6 flex items-center gap-3 p-3 sm:p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <Info className="text-[#0070BA] shrink-0" size={16} />
          <p className="text-[10px] text-blue-900/60 font-medium leading-relaxed">
            Seus dados estão protegidos conforme a LGPD. O Mapa Cultural nunca solicita sua senha por e-mail ou telefone.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
