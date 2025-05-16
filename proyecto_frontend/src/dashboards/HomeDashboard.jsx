import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { SunIcon, LightningBoltIcon,BookOpenIcon } from '@heroicons/react/outline';

const Card = memo(({ to, icon: Icon, title, description }) => (
  <Link
    to={to}
    className="
      flex items-center gap-4
      bg-white bg-opacity-90 backdrop-blur-md
      rounded-3xl p-8
      shadow-lg hover:shadow-2xl
      transform hover:-translate-y-1 hover:scale-105
      transition-all duration-300 ease-out
    "
  >
    <div
      className="
        flex items-center justify-center
        w-14 h-14 rounded-full
        bg-orange-100 text-orange-600
      "
      aria-hidden="true"
    >
      <Icon className="w-7 h-7" />
    </div>
    <div>
      <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
      <p className="text-base text-gray-600">{description}</p>
    </div>
  </Link>
));


const Home = memo(() => (
  <div className="
    relative min-h-screen bg-gradient-to-br from-gray-50 to-gray-200
    p-6 overflow-hidden flex flex-col items-center justify-center
  ">
    <div className="absolute top-0 left-0 w-full h-32 overflow-visible pointer-events-none">
      <div className="absolute -top-12 -left-16 w-48 h-48 bg-orange-400 rounded-full opacity-30" />
      <div className="absolute -top-8 left-1/4 w-64 h-64 bg-orange-600 rounded-full opacity-30" />
      <div className="absolute -top-14 left-1/2 w-56 h-56 bg-orange-200 rounded-full opacity-30" />
      <div className="absolute -top-10 right-1/4 w-72 h-72 bg-orange-400 rounded-full opacity-30" />
      <div className="absolute -top-16 right-0 w-48 h-48 bg-orange-600 rounded-full opacity-30" />
      <div className="absolute -top-2 right-0 w-50 h-48 bg-orange-800 rounded-full opacity-30" />
    </div>

    <div className="relative z-10 max-w-3xl w-full text-center space-y-6">
      <h1 className="text-5xl md:text-6xl font-bold text-gray-800">
        Predicciones
      </h1>
      <p className="text-lg text-gray-600">
        Seleccione el tipo de predicción que desea visualizar
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-20 mt-16">
        <Card
          to="/results"
          icon={SunIcon}
          title="Predicciones meteorológicas"
          description="Predicciones de las condiciones climaticas en tu zona"
        />
        <Card
          to="/consumption"
          icon={LightningBoltIcon}
          title="Predicciones de consumo"
          description="Predicciones de tu consumo energetico"
        />

        <Card
          to="/manual"
          icon={BookOpenIcon}
          title="Manual de usuario"
          description="Manual para cada una de los diferentes apartados"
        />
      </div>
      
    </div>
  </div>
));

export default Home;
