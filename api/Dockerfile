FROM ruby:3.4.12
                                                                                                        
RUN apt-get update -qq && apt-get install -y \                                                          
build-essential \                                               
libpq-dev \                                                                            
libvips \                                 
&& rm -rf /var/lib/apt/lists/*                                                                        

WORKDIR /plant-care-api                                                                                            
                                                                
COPY Gemfile Gemfile.lock ./                                                             
RUN bundle install                          

COPY . .

COPY entrypoint.sh /usr/bin/                                                                            
RUN chmod +x /usr/bin/entrypoint.sh
                                                                                                        
ENTRYPOINT ["entrypoint.sh"]                                                                            
                                                                                        
EXPOSE 3000                                                                                             
                                                                
CMD ["rails", "server", "-b", "0.0.0.0"]
