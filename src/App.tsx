import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import MainWorkspace from './components/Workspace/MainWorkspace'

function App() {
  return (
    <div className="min-h-screen bg-light-neutral flex flex-col">
      <Header />
      <main className="pt-16 flex-1">
        <MainWorkspace />
      </main>
      <Footer />
    </div>
  )
}

export default App
