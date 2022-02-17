import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import ActionDialogs from 'src/components/ActionDialogs';
import AppHeader from 'src/components/AppHeader';
import ElectronEventListener from 'src/components/ElectronEventListener';
import MissionControl, { useCommands } from 'src/components/MissionControl';
import Toasters from 'src/components/Toasters';
import dataApi from 'src/data/api';
import { getDefaultSessionId, setCurrentSessionId } from 'src/data/session';
import { useGetCurrentSession, useGetSessions, useUpsertSession } from 'src/hooks/useSession';
import { useDarkModeSetting } from 'src/hooks/useSetting';
import useToaster, { ToasterHandler } from 'src/hooks/useToaster';
import EditConnectionPage from 'src/views/EditConnectionPage';
import MainPage from 'src/views/MainPage';
import NewConnectionPage from 'src/views/NewConnectionPage';
import './App.scss';
import 'src/electronRenderer';
import * as THREE from 'three';

export default function App() {
  const [hasValidSessionId, setHasValidSessionId] = useState(false);
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const colorMode = useDarkModeSetting();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const toasterRef = useRef<ToasterHandler | undefined>();

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const geometry = new THREE.BoxGeometry();
    // const cube = new THREE.Mesh( geometry, material );
    // scene.add(new THREE.Mesh( geometry, material ) );


    var basicMaterial = new THREE.MeshLambertMaterial({
        color: 0x0095DD
    });

    // scene.add(new THREE.Mesh( new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial( {color: 0x00ff00} ) ) );
    for(let i = 1; i <= 3; i++){
      const mesh = new THREE.Mesh( new THREE.BoxGeometry(5, 5, 5), new THREE.MeshLambertMaterial({
          color: [0xff0000, 0x00ff00, 0x0000ff][i % 3]
      }) )

      mesh.position.set(0,0, i * 5)
      scene.add(mesh);
    }

    // camera.position.x = 0;
    // camera.position.y = -15;
    // camera.position.z = 10;

    // camera.rotation.x = 1.5

    camera.position.y = -15;
    camera.lookAt(new THREE.Vector3( 0, 0, 5 ));

    function animate() {
      requestAnimationFrame( animate );

      // cube.rotation.x += 0.01;
      // cube.rotation.y += 0.01;

      renderer.render( scene, camera );
    };

    // const light = new THREE.AmbientLight( 0x404040 ); // soft white light
    // scene.add( light );


        // var light = new THREE.AmbientLight(0x404040);

    // var light = new THREE.AmbientLight(0xf6e86d);
    // scene.add(light);

    // var light = new THREE.DirectionalLight(0x404040, 0.5);
    // scene.add(light);

    var light = new THREE.HemisphereLight(0x404040, 0xFFFFFF, 0.5);
    scene.add(light);



    // animate();

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const key = e.key;

      const delta = 0.1;

      switch(key){
        case 'w':
          camera.position.y += delta;
          break;
        case 's':
          camera.position.y -= delta;
          break;
        case 'a':
          camera.position.x -= delta;
          break;
        case 'd':
          camera.position.x += delta;
          break;
        case 'q':
          camera.position.z -= delta;
          break;
        case 'e':
          camera.position.z += delta;
          break;

        case 'i':
          camera.rotation.x += delta;
          camera.lookAt(new THREE.Vector3( 0, 0, 5 ));
          break;
        case 'k':
          camera.rotation.x -= delta;
          break;
        case 'j':
          camera.rotation.y += delta;
          break;
        case 'l':
          camera.rotation.y -= delta;
          break;
        case 'u':
          camera.rotation.z += delta;
          break;
        case 'o':
          camera.rotation.z -= delta;
          break;
      }

      renderer.render( scene, camera );

      console.log(camera.position, camera.rotation)
    });

    renderer.render( scene, camera );

    console.log(camera.position, camera.rotation)
  },[])

  return (
    <>
      <HashRouter>
        <MissionControl />
      </HashRouter>
      <ActionDialogs />
      <Toasters />
      <ElectronEventListener />
    </>
  );
}
