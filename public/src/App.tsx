// App.tsx

import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './page/Home';
import About from './page/About';
import Contact from './page/Contact';

function App() {
    return (
        <Router>
            <Switch>
                <Route path='/' component={Home} exact />
                <Route path='/about' component={About} />
                <Route path='/contact' component={Contact} />
            </Switch>
        </Router>
    );
}

export default App;
