const socket = io()

// server (emit) --> client (receive) -- acknowledgement --> server
// client (emit) --> server (receive) -- acknowledgemetn --> client

const $messageForm = document.getElementById('message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.getElementById('send-location')
const $messages = document.getElementById('messages')

// Templates
const messageTemplate = document.getElementById('message-template').innerHTML
const locationMessageTemplate = document.getElementById('location-message-template').innerHTML
const sidebarTemplate = document.getElementById('sidebar-template').innerHTML

//Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
  // New message element
  const $newMessage = $messages.lastElementChild

  // Height of new message

  const newMessageStyles = getComputedStyle($newMessage) //Function provided by browsers
  const newMessageMargin = parseInt(newMessageStyles.marginBottom)
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin // Does not take into account margins

  // Visible Height
  const visibleHeight = $messages.offsetHeight

  // Height of messages container
  const containerHeight = $messages.scrollHeight

  // How far have I scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight 
  // console.log('visible height', visibleHeight);
  // console.log('container height', containerHeight);
  // console.log('new message height', newMessageHeight);
  // console.log('Scroll offset', scrollOffset);
  // console.log('minus', containerHeight - newMessageHeight);
  if(Math.round(containerHeight - newMessageHeight) - 1 <= Math.round(scrollOffset)) {
    $messages.scrollTop = $messages.scrollHeight
  }

}

$messageForm.addEventListener('submit', (e)=> {
  e.preventDefault()
  // Disable submit button in the form
  $messageFormButton.disabled = true
  // let messageInput = e.target.elements.message
  // For ackowledgement add a function as the last parameter for the emit.
  socket.emit('sendMessage', $messageFormInput.value, error => {
    // Enable the button
    $messageFormButton.disabled = false
    $messageFormInput.value = ''
    $messageFormInput.focus()
    if(error) {
      return console.log(error);
    }
    console.log('Message Delivered.');
  })
})

socket.on('message', message => {
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format('hh:mm:ss A')
  })
  $messages.insertAdjacentHTML('beforeend', html)
  autoscroll()
})

socket.on('locationMessage', message => {
  const html = Mustache.render(locationMessageTemplate, {
    username: message.username,
    url: message.url,
    createdAt: moment(message.createdAt).format('hh:mm:ss A')
  })
  $messages.insertAdjacentHTML('beforeend', html)
  autoscroll()
})

$sendLocationButton.addEventListener('click', () => {
  if(!navigator.geolocation) {
    return alert('Geolocaton is not supported by your browser.')
  }
  $sendLocationButton.disabled = true
  navigator.geolocation.getCurrentPosition(position => {
    socket.emit('sendLocation', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    }, () => {
      $sendLocationButton.disabled = false
      console.log('Location shared!');
    })
  }, err => {
    $sendLocationButton.disabled = false
    console.log(err);
  })
})

socket.emit('join', { username, room }, error => {
  if(error) {
    alert(error)
    location.href = '/'
  }
})

socket.on('roomData', ({ room, users}) => {
  // console.log(room, users);
  const html = Mustache.render(sidebarTemplate, {
    room,
    users
  })
  document.getElementById('sidebar').innerHTML = html
})